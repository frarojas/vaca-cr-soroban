# VacaCR · Colecta Transparente en Stellar (Soroban)

**Autor:** Franco Vinicio Rojas Lagos  
**Red:** Stellar / Soroban Testnet (Rust `soroban-sdk`)  
**Demo en vivo:** https://frarojas.github.io/vaca-cr-soroban/

---

## 1. El problema

En Costa Rica es muy común hacer una **"vaca"** entre amigos, vecinos o compañeros de trabajo: para alquilar la cancha de la mejenga del sábado, organizar un paseo, comprar un regalo o arreglar algo en el barrio.

Hoy esto se resuelve pasándole la plata por SINPE Móvil a **una sola persona**, lo cual genera tres fricciones muy reales:
1. **Falta de transparencia:** nadie sabe en tiempo real cuánto se ha reunido ni cuánto falta para la meta sin estar preguntando por WhatsApp.
2. **Riesgo de custodia:** el dinero queda mezclado en la cuenta personal de quien organiza.
3. **Reembolsos difíciles:** si no se alcanza la meta antes de la fecha del evento (por ejemplo, faltó gente para la cancha), recuperar la plata depende de que el organizador haga cada devolución manual.

## 2. ¿Por qué elegimos este problema?

Es un problema cotidiano, pequeño y fácil de entender en Costa Rica, con reglas 100% objetivas:
- Hay una **meta** clara.
- Hay una **fecha límite** (`deadline`).
- O se cumple la meta y se le paga al **beneficiario**, o se vence el plazo y cada quien recupera exactamente lo que puso.

Esto lo hace un caso ideal para un contrato inteligente en **Stellar (Soroban)**: el contrato actúa como una caja de custodia neutral (*escrow*) donde las reglas no dependen de la buena fe de nadie y las comisiones de Stellar son mínimas.

## 3. Cómo funciona el contrato (`VacaCrContract`)

El contrato está escrito en Rust (`#![no_std]`) usando `soroban-sdk` en [`contracts/vaca_cr/src/lib.rs`](./contracts/vaca_cr/src/lib.rs) y opera sobre cualquier token SEP-41 en Stellar (por ejemplo, XLM nativo vía SAC).

### Flujo de estados (Multi-Vaca)

1. **Creación (`create_vaca`):**
   - Cualquier organizador crea una nueva vaca indicando **título** (ej. `"Mejenga del Sabado"`), **beneficiario**, **token**, **meta** (`goal > 0`) y **fecha límite** (`deadline > timestamp actual`).
   - El contrato asigna un `vaca_id` incremental (`1, 2, 3…`) y emite `VacaCreated`.
2. **Aportes (`contribute`):**
   - Antes del `deadline`, cualquier participante puede aportar a un `vaca_id` autorizando su firma (`contributor.require_auth()`).
   - El contrato transfiere los tokens a su propia dirección y guarda el acumulado individual en almacenamiento `persistent()` (`DataKey::Contribution(vaca_id, Address)`) extendiendo su TTL.
   - Emite el evento `Contributed`.
3. **Retiro por meta cumplida (`claim`):**
   - Si `total_raised >= goal`, únicamente el **beneficiario** (`config.beneficiary.require_auth()`) de ese `vaca_id` puede retirar todo lo recaudado.
   - Marca `Claimed(vaca_id) = true` antes de transferir los fondos y emite `Claimed`.
4. **Reembolso si no se llega a la meta (`refund`):**
   - Si ya pasó el `deadline` (`timestamp >= deadline`) y **no** se alcanzó la meta (`total_raised < goal`), cada participante puede retirar exactamente su aporte.
   - Borra su registro de aporte antes de transferir para evitar dobles reembolsos y emite `Refunded`.
5. **Consultas (`get_vaca_count`, `get_status`, `get_contribution`):**
   - Permiten listar todas las vacas creadas, ver el estado de cada una y consultar cuánto ha aportado una dirección específica.

### Decisiones técnicas aplicadas

- **Almacenamiento separado:** contador global en `instance()`, y cada vaca + aportes por usuario en `persistent()` con llaves granulares (`Vaca(u64)`, `TotalRaised(u64)`, `Claimed(u64)`, `Contribution(u64, Address)`) y `extend_ttl` en cada escritura.
- **Errores tipados (`#[contracterror]`):** `InvalidGoal`, `InvalidDeadline`, `InvalidAmount`, `DeadlinePassed`, `DeadlineNotReached`, `GoalNotReached`, `GoalAlreadyReached`, `AlreadyClaimed`, `NothingToRefund`, `VacaNotFound`, `Overflow`.
- **Seguridad:** verificación explícita con `require_auth()`, validación de montos positivos y actualización de estado antes de ejecutar transferencias externas.

---

## 4. Cómo usarlo (desde la aplicación web)

Puedes usar **VacaCR** directamente en **https://frarojas.github.io/vaca-cr-soroban/** sin instalar nada en tu computadora.

### Requisitos previos
- Tener una wallet compatible con **Stellar Testnet** (por ejemplo **Freighter / Varial**, **xBull** o **Albedo**).
- Cambiar la red de tu wallet a **Testnet** *(nota: la extensión de LOBSTR solo firma transacciones en Mainnet, por lo que para Testnet se recomienda Freighter, xBull o Albedo)*.

### Pasos de uso
1. **Explorar colectas activas:** Al abrir la página, la sección **Colectas Activas** consulta en vivo el contrato en Soroban Testnet y muestra el progreso de cada vaca sin necesidad de conectar wallet.
2. **Conectar tu wallet:** Haz clic en **"Conectar Wallet"** y selecciona tu wallet en el selector.
3. **Fondear tu cuenta en Testnet (si es nueva):** Si tu dirección aún no tiene saldo en Testnet, aparecerá el botón **"Fondear cuenta con Friendbot"** para recibir `10,000 XLM` de prueba gratis.
4. **Crear una vaca nueva:** Haz clic en **"Crear nueva vaca"**, completa el nombre, la dirección del beneficiario (`G…`), la meta en XLM y los días de plazo, y firma la transacción en tu wallet.
5. **Aportar a una vaca:** En cualquier vaca abierta, ingresa el monto en XLM y haz clic en **"Aportar XLM"**. Al confirmar la firma en tu wallet, el progreso se actualizará al instante con un enlace a Stellar Expert.
6. **Reclamar o pedir reembolso:**
   - Si la vaca alcanzó su meta, el beneficiario verá el botón **"Reclamar fondos"**.
   - Si venció el plazo sin alcanzar la meta, cada participante verá el botón **"Solicitar reembolso"** para recuperar su aporte exacto.

---

## 5. Cómo probarlo

### Opción A: Pruebas unitarias del contrato (`cargo test`)

Requisitos: **Rust + Cargo**.

```bash
cargo test
```

Las pruebas en [`contracts/vaca_cr/src/test.rs`](./contracts/vaca_cr/src/test.rs) cubren:
1. **`test_create_multiple_vacas_and_claim`**: crea dos vacas independientes, registra múltiples aportes hasta cumplir la meta de la primera y verifica que el beneficiario reclame el total exacto.
2. **`test_refund_when_deadline_expires_without_goal`**: verifica que no se pueda pedir reembolso antes del plazo, avanza el reloj del ledger (`env.ledger().set_timestamp(...)`), valida que tras vencer el plazo no entren más aportes ni se pueda reclamar, y comprueba que cada participante recupere su aporte exacto sin poder cobrar dos veces.
3. **`test_rejects_invalid_amounts_and_requires_auth`**: valida el rechazo de montos `<= 0` y confirma mediante `env.auths()` que `contribute` exige la firma del contribuyente.

### Opción B: Correr la landing page localmente

Requisitos: **Node.js 22+** y **pnpm**.

```bash
cd frontend
pnpm install
pnpm dev
```

Abre la URL local que imprime Vite (por defecto `http://localhost:5173`).

### Opción C: Probar el contrato en vivo desde CLI o Stellar Lab

- **Contract ID (Testnet):** `CAHS6XCJDVRZ7JOAQ7CV5CSBUJGGSWMSXDDUDMTQJSDXH4TDYX2FSHEP`
- **Explorar e invocar en Stellar Lab:** https://lab.stellar.org/r/testnet/contract/CAHS6XCJDVRZ7JOAQ7CV5CSBUJGGSWMSXDDUDMTQJSDXH4TDYX2FSHEP
- **Transacción de despliegue:** [`83ad51205b6fc0ac82b8fc61c90f1c10b3cd7100f27aa2f1d85c78ce8e666ec4`](https://stellar.expert/explorer/testnet/tx/83ad51205b6fc0ac82b8fc61c90f1c10b3cd7100f27aa2f1d85c78ce8e666ec4)
- **Creación de Vaca #1:** [`e98289dd5ffdfcb2d05d70682ee87a9e1395b11c476f5a3c404344802610c068`](https://stellar.expert/explorer/testnet/tx/e98289dd5ffdfcb2d05d70682ee87a9e1395b11c476f5a3c404344802610c068)
- **Aporte de prueba en vivo (1 XLM):** [`2b2a0ce2fda9276806896a323aec7b6b8272c05173e0192e1d11453314141332`](https://stellar.expert/explorer/testnet/tx/2b2a0ce2fda9276806896a323aec7b6b8272c05173e0192e1d11453314141332)

```bash
# Consultar cuántas vacas existen
stellar contract invoke \
  --id CAHS6XCJDVRZ7JOAQ7CV5CSBUJGGSWMSXDDUDMTQJSDXH4TDYX2FSHEP \
  --network testnet \
  -- get_vaca_count

# Consultar el estado actual de la Vaca #1
stellar contract invoke \
  --id CAHS6XCJDVRZ7JOAQ7CV5CSBUJGGSWMSXDDUDMTQJSDXH4TDYX2FSHEP \
  --network testnet \
  -- get_status --vaca_id 1
```

#### Compilar y desplegar tu propia instancia (opcional)

```bash
# Compilar contrato optimizado (.wasm)
stellar contract build

# Desplegar en Testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/vaca_cr.wasm \
  --source-account TU_CUENTA \
  --network testnet
```
