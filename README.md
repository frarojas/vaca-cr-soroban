# VacaCR · Colecta Transparente en Stellar (Soroban)

**Autor:** Franco Vinicio Rojas Lagos  
**Red:** Stellar / Soroban (Rust `soroban-sdk`)

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

El contrato está escrito en Rust (`#![no_std]`) usando `soroban-sdk` en [`contracts/vaca_cr/src/lib.rs`](./contracts/vaca_cr/src/lib.rs) y opera sobre cualquier token SEP-41 en Stellar (por ejemplo, XLM o USDC).

### Flujo de estados

1. **Creación (`__constructor`):**
   - El organizador define el **título** (ej. `"Mejenga del Sabado"`), el **beneficiario**, el **token**, la **meta** (`goal > 0`) y la **fecha límite** (`deadline > timestamp actual`).
   - Emite el evento `VacaCreated`.
2. **Aportes (`contribute`):**
   - Antes del `deadline`, cualquier participante puede aportar un monto mayor a `0` autorizando su firma (`contributor.require_auth()`).
   - El contrato transfiere los tokens a su propia dirección y guarda el acumulado individual en almacenamiento `persistent()` (`DataKey::Contribution(Address)`) extendiendo su TTL.
   - Emite el evento `Contributed`.
3. **Retiro por meta cumplida (`claim`):**
   - Si `total_raised >= goal`, únicamente el **beneficiario** (`config.beneficiary.require_auth()`) puede retirar todo lo recaudado.
   - Marca `Claimed = true` antes de transferir los fondos y emite `Claimed`.
4. **Reembolso si no se llega a la meta (`refund`):**
   - Si ya pasó el `deadline` (`timestamp >= deadline`) y **no** se alcanzó la meta (`total_raised < goal`), cada participante puede retirar exactamente su aporte.
   - Borra su registro de aporte antes de transferir para evitar dobles reembolsos y emite `Refunded`.
5. **Consultas (`get_status`, `get_contribution`):**
   - Permiten ver el estado general de la vaca (`total_raised`, `goal_reached`, `is_open`, `claimed`) y cuánto ha aportado una dirección específica.

### Decisiones técnicas aplicadas

- **Almacenamiento separado:** configuración global y totales en `instance()`, y aportes por persona en `persistent()` con llaves granulares `Contribution(Address)` y `extend_ttl` en cada escritura.
- **Errores tipados (`#[contracterror]`):** `InvalidGoal`, `InvalidDeadline`, `InvalidAmount`, `DeadlinePassed`, `DeadlineNotReached`, `GoalNotReached`, `GoalAlreadyReached`, `AlreadyClaimed`, `NothingToRefund`, `NotInitialized`, `Overflow`.
- **Seguridad:** verificación explícita con `require_auth()`, validación de montos positivos y actualización de estado antes de ejecutar transferencias externas.

## 4. Cómo correrlo y probarlo

### Requisitos
- **Rust + Cargo** (instalado con `rustup`)
- Opcional para compilar a WebAssembly y desplegar en Testnet: target `wasm32v1-none` y `stellar-cli`

### Ejecutar las pruebas unitarias

```bash
cargo test
```

Las pruebas incluidas en [`contracts/vaca_cr/src/test.rs`](./contracts/vaca_cr/src/test.rs) cubren:
1. **`test_successful_vaca_and_claim`**: múltiples participantes aportan hasta alcanzar la meta, se verifican los balances individuales y el beneficiario reclama el total recaudado.
2. **`test_refund_when_deadline_expires_without_goal`**: verifica que no se pueda pedir reembolso antes del plazo, avanza el reloj del ledger (`env.ledger().set_timestamp(...)`), valida que tras vencer el plazo no entren más aportes ni se pueda reclamar, y comprueba que cada participante recupere su aporte exacto sin poder cobrar dos veces.
3. **`test_rejects_invalid_amounts_and_requires_auth`**: valida el rechazo de montos `<= 0` y confirma mediante `env.auths()` que `contribute` exige la firma del contribuyente.

### Compilar a Wasm y desplegar en Stellar Testnet

#### Contrato desplegado y funcional en Testnet

- **Contract ID:** `CCBJUJLCPRXPZOUXHHYSVXX3WGCD3YG7DA3JT2U7GOECLOXV65LZBQ2N`
- **Explorar en Stellar Lab:** https://lab.stellar.org/r/testnet/contract/CCBJUJLCPRXPZOUXHHYSVXX3WGCD3YG7DA3JT2U7GOECLOXV65LZBQ2N
- **Transacción de despliegue:** [`f526f6a9dd7954a790badd40243b7933f2bfe4618d811fa29151e8b0253f1665`](https://stellar.expert/explorer/testnet/tx/f526f6a9dd7954a790badd40243b7933f2bfe4618d811fa29151e8b0253f1665)
- **Aporte de prueba en vivo (1 XLM):** [`7e96d2de9fa0c036523356812e66a8dbadcb7edbb87dd6ba3a38a7864902d583`](https://stellar.expert/explorer/testnet/tx/7e96d2de9fa0c036523356812e66a8dbadcb7edbb87dd6ba3a38a7864902d583)

```bash
# Consultar el estado actual del contrato desplegado en Testnet
stellar contract invoke \
  --id CCBJUJLCPRXPZOUXHHYSVXX3WGCD3YG7DA3JT2U7GOECLOXV65LZBQ2N \
  --network testnet \
  -- get_status
```

#### Cómo compilar y desplegar una nueva instancia

```bash
# Compilar contrato optimizado (.wasm)
stellar contract build

# Desplegar en Testnet (ajustando tus direcciones y fecha límite Unix)
stellar contract deploy \
  --wasm target/wasm32v1-none/release/vaca_cr.wasm \
  --source-account TU_CUENTA \
  --network testnet \
  -- \
  --organizer TU_CUENTA \
  --beneficiary DIRECCION_BENEFICIARIO \
  --token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC \
  --title "Mejenga del Sabado" \
  --goal 100000000 \
  --deadline 1798200000
```
