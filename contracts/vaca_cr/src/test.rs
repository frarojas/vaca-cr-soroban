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

fn setup_env<'a>() -> TestContext<'a> {
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

    let contract_id = env.register(VacaCrContract, ());
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
fn test_create_multiple_vacas_and_claim() {
    let ctx = setup_env();
    let ana = Address::generate(&ctx.env);
    let carlos = Address::generate(&ctx.env);

    ctx.token_admin.mint(&ana, &10_000);
    ctx.token_admin.mint(&carlos, &5_000);

    let vaca1 = ctx.contract.create_vaca(
        &ctx.organizer,
        &ctx.beneficiary,
        &ctx.token_id,
        &String::from_str(&ctx.env, "Mejenga del Sabado"),
        &10_000,
        &5_000,
    );
    let vaca2 = ctx.contract.create_vaca(
        &ana,
        &carlos,
        &ctx.token_id,
        &String::from_str(&ctx.env, "Paseo Guanacaste"),
        &25_000,
        &9_000,
    );

    assert_eq!(vaca1, 1);
    assert_eq!(vaca2, 2);
    assert_eq!(ctx.contract.get_vaca_count(), 2);

    assert_eq!(ctx.contract.contribute(&vaca1, &ana, &5_000), 5_000);
    assert_eq!(ctx.contract.contribute(&vaca1, &carlos, &5_000), 10_000);
    assert_eq!(ctx.contract.get_contribution(&vaca1, &ana), 5_000);
    assert_eq!(ctx.contract.get_contribution(&vaca2, &ana), 0);

    let claimed = ctx.contract.claim(&vaca1);
    assert_eq!(claimed, 10_000);
    assert_eq!(ctx.token.balance(&ctx.beneficiary), 10_000);

    let status1 = ctx.contract.get_status(&vaca1);
    assert!(status1.claimed);
    assert!(status1.goal_reached);
    assert!(!status1.is_open);
}

#[test]
fn test_refund_when_deadline_expires_without_goal() {
    let ctx = setup_env();
    let ana = Address::generate(&ctx.env);
    let carlos = Address::generate(&ctx.env);

    ctx.token_admin.mint(&ana, &3_000);
    ctx.token_admin.mint(&carlos, &4_000);

    let vaca_id = ctx.contract.create_vaca(
        &ctx.organizer,
        &ctx.beneficiary,
        &ctx.token_id,
        &String::from_str(&ctx.env, "Regalo Profe"),
        &10_000,
        &5_000,
    );

    ctx.contract.contribute(&vaca_id, &ana, &3_000);
    ctx.contract.contribute(&vaca_id, &carlos, &4_000);

    assert_eq!(
        ctx.contract.try_refund(&vaca_id, &ana),
        Err(Ok(Error::DeadlineNotReached))
    );

    ctx.env.ledger().set_timestamp(5_001);

    assert_eq!(
        ctx.contract.try_contribute(&vaca_id, &ana, &500),
        Err(Ok(Error::DeadlinePassed))
    );
    assert_eq!(
        ctx.contract.try_claim(&vaca_id),
        Err(Ok(Error::GoalNotReached))
    );

    assert_eq!(ctx.contract.refund(&vaca_id, &ana), 3_000);
    assert_eq!(ctx.contract.refund(&vaca_id, &carlos), 4_000);
    assert_eq!(ctx.token.balance(&ana), 3_000);
    assert_eq!(ctx.token.balance(&carlos), 4_000);
    assert_eq!(
        ctx.contract.try_refund(&vaca_id, &ana),
        Err(Ok(Error::NothingToRefund))
    );
}

#[test]
fn test_rejects_invalid_amounts_and_requires_auth() {
    let ctx = setup_env();
    let ana = Address::generate(&ctx.env);
    ctx.token_admin.mint(&ana, &5_000);

    let vaca_id = ctx.contract.create_vaca(
        &ctx.organizer,
        &ctx.beneficiary,
        &ctx.token_id,
        &String::from_str(&ctx.env, "Almuerzo Equipo"),
        &5_000,
        &5_000,
    );

    assert_eq!(
        ctx.contract.try_contribute(&vaca_id, &ana, &0),
        Err(Ok(Error::InvalidAmount))
    );
    assert_eq!(
        ctx.contract.try_contribute(&vaca_id, &ana, &-100),
        Err(Ok(Error::InvalidAmount))
    );

    ctx.contract.contribute(&vaca_id, &ana, &1_500);
    assert!(!ctx.env.auths().is_empty());
    let (auth_addr, _) = &ctx.env.auths()[0];
    assert_eq!(auth_addr, &ana);
}
