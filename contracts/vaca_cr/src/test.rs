#![cfg(test)]
extern crate std;

use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    Address, Env, String,
};

use crate::{Error, VacaCrContract, VacaCrContractClient};

struct TestContext<'a> {
    env: Env,
    organizer: Address,
    beneficiary: Address,
    token_id: Address,
    token: TokenClient<'a>,
    token_admin: StellarAssetClient<'a>,
    contract: VacaCrContractClient<'a>,
}

fn setup_vaca<'a>(goal: i128, deadline: u64) -> TestContext<'a> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let organizer = Address::generate(&env);
    let beneficiary = Address::generate(&env);
    let token_admin_addr = Address::generate(&env);
    let token_contract = env.register_stellar_asset_contract_v2(token_admin_addr);
    let token_id = token_contract.address();

    let token = TokenClient::new(&env, &token_id);
    let token_admin = StellarAssetClient::new(&env, &token_id);

    let title = String::from_str(&env, "Mejenga del Sabado");
    let contract_id = env.register(
        VacaCrContract,
        (
            organizer.clone(),
            beneficiary.clone(),
            token_id.clone(),
            title,
            goal,
            deadline,
        ),
    );
    let contract = VacaCrContractClient::new(&env, &contract_id);

    TestContext {
        env,
        organizer,
        beneficiary,
        token_id,
        token,
        token_admin,
        contract,
    }
}

#[test]
fn test_successful_vaca_and_claim() {
    let ctx = setup_vaca(10_000, 5_000);
    let ana = Address::generate(&ctx.env);
    let carlos = Address::generate(&ctx.env);

    ctx.token_admin.mint(&ana, &6_000);
    ctx.token_admin.mint(&carlos, &5_000);

    assert_eq!(ctx.contract.contribute(&ana, &4_000), 4_000);
    assert_eq!(ctx.contract.contribute(&carlos, &5_000), 9_000);
    assert_eq!(ctx.contract.contribute(&ana, &1_000), 10_000);

    assert_eq!(ctx.contract.get_contribution(&ana), 5_000);
    assert_eq!(ctx.contract.get_contribution(&carlos), 5_000);
    assert_eq!(ctx.token.balance(&ctx.contract.address), 10_000);

    let claimed = ctx.contract.claim();
    assert_eq!(claimed, 10_000);
    assert_eq!(ctx.token.balance(&ctx.beneficiary), 10_000);
    assert_eq!(ctx.token.balance(&ctx.contract.address), 0);

    let status = ctx.contract.get_status();
    assert!(status.claimed);
    assert!(status.goal_reached);
    assert!(!status.is_open);
}

#[test]
fn test_refund_when_deadline_expires_without_goal() {
    let ctx = setup_vaca(10_000, 5_000);
    let ana = Address::generate(&ctx.env);
    let carlos = Address::generate(&ctx.env);

    ctx.token_admin.mint(&ana, &3_000);
    ctx.token_admin.mint(&carlos, &4_000);

    ctx.contract.contribute(&ana, &3_000);
    ctx.contract.contribute(&carlos, &4_000);

    // Antes de la fecha límite no se puede pedir reembolso
    assert_eq!(ctx.contract.try_refund(&ana), Err(Ok(Error::DeadlineNotReached)));

    // Avanza el reloj más allá del deadline
    ctx.env.ledger().set_timestamp(5_001);

    // Ya no se aceptan nuevos aportes
    assert_eq!(
        ctx.contract.try_contribute(&ana, &500),
        Err(Ok(Error::DeadlinePassed))
    );

    // Tampoco se puede reclamar porque no se llegó a la meta
    assert_eq!(ctx.contract.try_claim(), Err(Ok(Error::GoalNotReached)));

    // Cada participante recupera exactamente lo que aportó
    assert_eq!(ctx.contract.refund(&ana), 3_000);
    assert_eq!(ctx.contract.refund(&carlos), 4_000);
    assert_eq!(ctx.token.balance(&ana), 3_000);
    assert_eq!(ctx.token.balance(&carlos), 4_000);
    assert_eq!(ctx.token.balance(&ctx.contract.address), 0);

    // No se puede pedir doble reembolso
    assert_eq!(ctx.contract.try_refund(&ana), Err(Ok(Error::NothingToRefund)));
}

#[test]
fn test_rejects_invalid_amounts_and_requires_auth() {
    let ctx = setup_vaca(5_000, 5_000);
    let ana = Address::generate(&ctx.env);
    ctx.token_admin.mint(&ana, &5_000);

    assert_eq!(
        ctx.contract.try_contribute(&ana, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        ctx.contract.try_contribute(&ana, &-100),
        Err(Ok(Error::InvalidAmount))
    );

    // Verifica que contribute solicita autorización del contribuyente
    ctx.contract.contribute(&ana, &1_500);
    assert!(!ctx.env.auths().is_empty());
    let (auth_addr, _) = &ctx.env.auths()[0];
    assert_eq!(auth_addr, &ana);
    assert_eq!(ctx.organizer, ctx.contract.get_status().organizer);
    assert_eq!(ctx.token_id, ctx.contract.get_status().token);
}
