# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Grupos de amigos, compañeros de trabajo, equipos de mejenga y vecinos en Costa Rica que organizan colectas pequeñas ("vacas") para gastos compartidos como alquiler de cancha, paseos, regalos grupales o mejoras comunales, así como revisores e instructores del Pura Vida Bootcamp que evalúan el contrato inteligente en vivo.

## Product Purpose

VacaCR reemplaza la colecta informal en una cuenta personal (donde nadie ve cuánto falta y los reembolsos son manuales) por una colecta transparente sobre Stellar Soroban. El éxito significa que cualquier visitante entienda en segundos cómo funciona la custodia neutral del contrato, consulte en vivo el avance de cada vaca y pueda conectar su wallet en Testnet para crear una vaca nueva, aportar XLM, reclamar la meta o recuperar su aporte vencido el plazo.

## Positioning

Un contrato inteligente multi-vaca en Stellar Soroban (`VacaCrContract`) que actúa como custodia neutral sin intermediarios: bloquea los aportes en XLM bajo una meta y una fecha límite inmutables en cadena, liberando el total únicamente al beneficiario si se alcanza el 100 % o habilitando el reembolso exacto a cada participante si expira el plazo.

## Operating Context

Se consulta y opera desde navegadores de escritorio y móviles, frecuentemente compartiendo el enlace en chats grupales. Opera sobre **Stellar Testnet** usando el contrato desplegado `CAHS6XCJDVRZ7JOAQ7CV5CSBUJGGSWMSXDDUDMTQJSDXH4TDYX2FSHEP` y el Stellar Asset Contract nativo de XLM (`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`). Las firmas requieren una wallet compatible con Testnet (Freighter / Varial, xBull o Albedo; LOBSTR solo firma en Mainnet) y cuentas nuevas se activan mediante Friendbot (+10,000 XLM de prueba). Es un entregable práctico individual del Pura Vida Bootcamp (Oppia Software Labs).

## Capabilities and Constraints

- Consultar en vivo todas las vacas creadas (`get_vaca_count`, `get_status`) sin requerir conexión previa de wallet.
- Conectar y desconectar wallets de Stellar mediante `@creit-tech/stellar-wallets-kit` v2 en Testnet.
- Detectar cuentas no activadas en Testnet y fondearlas con un clic vía Friendbot.
- Crear nuevas vacas (`create_vaca`) definiendo título, dirección del beneficiario (`G…`), meta en XLM y plazo en días.
- Aportar XLM a cualquier vaca abierta (`contribute`) y consultar el aporte personal acumulado (`get_contribution`).
- Reclamar el total recaudado (`claim`) cuando el usuario conectado es el beneficiario y se alcanzó la meta.
- Solicitar reembolso individual (`refund`) cuando venció la fecha límite sin haberse alcanzado la meta.
- Despliegue estático en GitHub Pages (`https://frarojas.github.io/vaca-cr-soroban/`) desde la rama `main`.

## Brand Commitments

- Nombre del proyecto: **VacaCR** (autor: Franco Vinicio Rojas Lagos).
- Idioma: español costarricense natural, claro y directo, evitando jerga cripto innecesaria donde términos cotidianos explican mejor la regla.

## Evidence on Hand

- Contrato `VacaCrContract` en Rust/Soroban (`contracts/vaca_cr/src/lib.rs`) con suite de pruebas unitarias (`contracts/vaca_cr/src/test.rs`).
- Instancia real desplegada y verificada en Stellar Testnet: `CAHS6XCJDVRZ7JOAQ7CV5CSBUJGGSWMSXDDUDMTQJSDXH4TDYX2FSHEP`, con colecta inicial activa (*"Mejenga del Sabado"*).
- Enlaces verificables a Stellar Lab y Stellar Expert para el contrato y cada transacción firmada.
- No existen testimonios comerciales, métricas de usuarios reales en Mainnet ni alianzas bancarias/SINPE; no deben fabricarse.

## Product Principles

1. **Reglas visibles antes de pedir firma:** cada vaca debe dejar inequívoco cuánto lleva, cuánto falta, cuándo cierra y qué ocurre con el dinero en ambos escenarios (meta cumplida vs. reembolso).
2. **Cero fricción en Testnet:** guiar paso a paso desde conectar una wallet compatible hasta fondear con Friendbot y ejecutar la acción en cadena, con errores legibles para humanos.
3. **Separar explicación de operación:** quien llega por primera vez comprende el problema y el mecanismo de custodia antes de entrar al tablero operativo de colectas, mientras quien ya viene a aportar encuentra su vaca de inmediato.
4. **Verificabilidad real sobre promesas:** cada cifra mostrada proviene de Soroban Testnet o está claramente etiquetada cuando sea ilustrativa, siempre acompañada de enlaces directos al explorador.
