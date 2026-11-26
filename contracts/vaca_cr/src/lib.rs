#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    String,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const INSTANCE_BUMP_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_BUMP_TO: u32 = 120 * DAY_IN_LEDGERS;
const PERSISTENT_BUMP_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const PERSISTENT_BUMP_TO: u32 = 120 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    VacaCount,
    Vaca(u64),
    TotalRaised(u64),
    Claimed(u64),
    Contribution(u64, Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VacaConfig {
    pub id: u64,
    pub title: String,
    pub organizer: Address,
    pub beneficiary: Address,
    pub token: Address,
    pub goal: i128,
    pub deadline: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VacaStatus {
    pub id: u64,
    pub title: String,
    pub organizer: Address,
    pub beneficiary: Address,
    pub token: Address,
    pub goal: i128,
    pub deadline: u64,
    pub total_raised: i128,
    pub claimed: bool,
    pub goal_reached: bool,
    pub is_open: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidGoal = 1,
    InvalidDeadline = 2,
    InvalidAmount = 3,
    DeadlinePassed = 4,
    DeadlineNotReached = 5,
    GoalNotReached = 6,
    GoalAlreadyReached = 7,
    AlreadyClaimed = 8,
    NothingToRefund = 9,
    VacaNotFound = 10,
    Overflow = 11,
}

#[contractevent]
pub struct VacaCreated {
    #[topic]
    pub vaca_id: u64,
    #[topic]
    pub organizer: Address,
    pub beneficiary: Address,
    pub goal: i128,
    pub deadline: u64,
}

#[contractevent]
pub struct Contributed {
    #[topic]
    pub vaca_id: u64,
    #[topic]
    pub contributor: Address,
    pub amount: i128,
    pub total_raised: i128,
}

#[contractevent]
pub struct Claimed {
    #[topic]
    pub vaca_id: u64,
    #[topic]
    pub beneficiary: Address,
    pub total_raised: i128,
}

#[contractevent]
pub struct Refunded {
    #[topic]
    pub vaca_id: u64,
    #[topic]
    pub contributor: Address,
    pub amount: i128,
}

#[contract]
pub struct VacaCrContract;

#[contractimpl]
impl VacaCrContract {
    /// Crea una nueva colecta ("vaca") con meta, fecha límite (timestamp Unix en segundos),
    /// token SEP-41 de aporte (por ejemplo XLM) y beneficiario. Devuelve el `vaca_id`.
    pub fn create_vaca(
        env: Env,
        organizer: Address,
        beneficiary: Address,
        token: Address,
        title: String,
        goal: i128,
        deadline: u64,
    ) -> Result<u64, Error> {
        organizer.require_auth();

        if goal <= 0 {
            return Err(Error::InvalidGoal);
        }
        if deadline <= env.ledger().timestamp() {
            return Err(Error::InvalidDeadline);
        }

        let current_count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::VacaCount)
            .unwrap_or(0);
        let vaca_id = current_count.checked_add(1).ok_or(Error::Overflow)?;

        let config = VacaConfig {
            id: vaca_id,
            title,
            organizer: organizer.clone(),
            beneficiary: beneficiary.clone(),
            token,
            goal,
            deadline,
        };

        let vaca_key = DataKey::Vaca(vaca_id);
        let total_key = DataKey::TotalRaised(vaca_id);
        let claimed_key = DataKey::Claimed(vaca_id);

        env.storage().instance().set(&DataKey::VacaCount, &vaca_id);
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_BUMP_THRESHOLD, INSTANCE_BUMP_TO);

        env.storage().persistent().set(&vaca_key, &config);
        env.storage()
            .persistent()
            .extend_ttl(&vaca_key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_TO);

        env.storage().persistent().set(&total_key, &0i128);
        env.storage()
            .persistent()
            .extend_ttl(&total_key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_TO);

        env.storage().persistent().set(&claimed_key, &false);
        env.storage()
            .persistent()
            .extend_ttl(&claimed_key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_TO);

        VacaCreated {
            vaca_id,
            organizer,
            beneficiary,
            goal,
            deadline,
        }
        .publish(&env);

        Ok(vaca_id)
    }

    /// Permite a cualquier participante aportar a una vaca antes de su fecha límite.
    pub fn contribute(
        env: Env,
        vaca_id: u64,
        contributor: Address,
        amount: i128,
    ) -> Result<i128, Error> {
        contributor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let config = Self::load_vaca(&env, vaca_id)?;
        if env.ledger().timestamp() >= config.deadline {
            return Err(Error::DeadlinePassed);
        }

        let claimed: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Claimed(vaca_id))
            .unwrap_or(false);
        if claimed {
            return Err(Error::AlreadyClaimed);
        }

        let token_client = token::Client::new(&env, &config.token);
        token_client.transfer(&contributor, &env.current_contract_address(), &amount);

        let contrib_key = DataKey::Contribution(vaca_id, contributor.clone());
        let previous: i128 = env.storage().persistent().get(&contrib_key).unwrap_or(0);
        let updated_contribution = previous.checked_add(amount).ok_or(Error::Overflow)?;
        env.storage()
            .persistent()
            .set(&contrib_key, &updated_contribution);
        env.storage()
            .persistent()
            .extend_ttl(&contrib_key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_TO);

        let total_key = DataKey::TotalRaised(vaca_id);
        let total_raised: i128 = env.storage().persistent().get(&total_key).unwrap_or(0);
        let new_total = total_raised.checked_add(amount).ok_or(Error::Overflow)?;
        env.storage().persistent().set(&total_key, &new_total);
        env.storage()
            .persistent()
            .extend_ttl(&total_key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_TO);

        env.storage()
            .instance()
            .extend_ttl(INSTANCE_BUMP_THRESHOLD, INSTANCE_BUMP_TO);

        Contributed {
            vaca_id,
            contributor,
            amount,
            total_raised: new_total,
        }
        .publish(&env);

        Ok(new_total)
    }

    /// Permite al beneficiario retirar el total recaudado si la vaca alcanzó la meta.
    pub fn claim(env: Env, vaca_id: u64) -> Result<i128, Error> {
        let config = Self::load_vaca(&env, vaca_id)?;
        config.beneficiary.require_auth();

        let claimed_key = DataKey::Claimed(vaca_id);
        let claimed: bool = env.storage().persistent().get(&claimed_key).unwrap_or(false);
        if claimed {
            return Err(Error::AlreadyClaimed);
        }

        let total_raised: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalRaised(vaca_id))
            .unwrap_or(0);
        if total_raised < config.goal {
            return Err(Error::GoalNotReached);
        }

        env.storage().persistent().set(&claimed_key, &true);
        env.storage()
            .persistent()
            .extend_ttl(&claimed_key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_TO);

        let token_client = token::Client::new(&env, &config.token);
        token_client.transfer(
            &env.current_contract_address(),
            &config.beneficiary,
            &total_raised,
        );

        Claimed {
            vaca_id,
            beneficiary: config.beneficiary,
            total_raised,
        }
        .publish(&env);

        Ok(total_raised)
    }

    /// Si venció el plazo sin alcanzar la meta, cada participante puede recuperar su aporte.
    pub fn refund(env: Env, vaca_id: u64, contributor: Address) -> Result<i128, Error> {
        contributor.require_auth();

        let config = Self::load_vaca(&env, vaca_id)?;
        let claimed: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Claimed(vaca_id))
            .unwrap_or(false);
        if claimed {
            return Err(Error::AlreadyClaimed);
        }

        if env.ledger().timestamp() < config.deadline {
            return Err(Error::DeadlineNotReached);
        }

        let total_raised: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalRaised(vaca_id))
            .unwrap_or(0);
        if total_raised >= config.goal {
            return Err(Error::GoalAlreadyReached);
        }

        let contrib_key = DataKey::Contribution(vaca_id, contributor.clone());
        let contributed: i128 = env.storage().persistent().get(&contrib_key).unwrap_or(0);
        if contributed <= 0 {
            return Err(Error::NothingToRefund);
        }

        env.storage().persistent().remove(&contrib_key);

        let token_client = token::Client::new(&env, &config.token);
        token_client.transfer(&env.current_contract_address(), &contributor, &contributed);

        Refunded {
            vaca_id,
            contributor,
            amount: contributed,
        }
        .publish(&env);

        Ok(contributed)
    }

    /// Devuelve el total de vacas creadas en el contrato.
    pub fn get_vaca_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::VacaCount)
            .unwrap_or(0)
    }

    /// Devuelve el estado general de una vaca específica.
    pub fn get_status(env: Env, vaca_id: u64) -> Result<VacaStatus, Error> {
        let config = Self::load_vaca(&env, vaca_id)?;
        let total_raised: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalRaised(vaca_id))
            .unwrap_or(0);
        let claimed: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Claimed(vaca_id))
            .unwrap_or(false);

        Ok(VacaStatus {
            id: config.id,
            title: config.title,
            organizer: config.organizer,
            beneficiary: config.beneficiary,
            token: config.token,
            goal: config.goal,
            deadline: config.deadline,
            total_raised,
            claimed,
            goal_reached: total_raised >= config.goal,
            is_open: !claimed && env.ledger().timestamp() < config.deadline,
        })
    }

    /// Devuelve cuánto ha aportado una dirección a una vaca específica.
    pub fn get_contribution(env: Env, vaca_id: u64, contributor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(vaca_id, contributor))
            .unwrap_or(0)
    }

    fn load_vaca(env: &Env, vaca_id: u64) -> Result<VacaConfig, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Vaca(vaca_id))
            .ok_or(Error::VacaNotFound)
    }
}

mod test;
