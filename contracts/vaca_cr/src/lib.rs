#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, Env, String,
};

const DAY_IN_LEDGERS: u32 = 17_280;
const INSTANCE_BUMP_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const INSTANCE_BUMP_TO: u32 = 120 * DAY_IN_LEDGERS;
const PERSISTENT_BUMP_THRESHOLD: u32 = 30 * DAY_IN_LEDGERS;
const PERSISTENT_BUMP_TO: u32 = 120 * DAY_IN_LEDGERS;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Config,
    TotalRaised,
    Claimed,
    Contribution(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VacaConfig {
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
    NotInitialized = 10,
    Overflow = 11,
}

#[contractevent]
pub struct VacaCreated {
    #[topic]
    pub organizer: Address,
    pub beneficiary: Address,
    pub goal: i128,
    pub deadline: u64,
}

#[contractevent]
pub struct Contributed {
    #[topic]
    pub contributor: Address,
    pub amount: i128,
    pub total_raised: i128,
}

#[contractevent]
pub struct Claimed {
    #[topic]
    pub beneficiary: Address,
    pub total_raised: i128,
}

#[contractevent]
pub struct Refunded {
    #[topic]
    pub contributor: Address,
    pub amount: i128,
}

#[contract]
pub struct VacaCrContract;

#[contractimpl]
impl VacaCrContract {
    /// Inicializa la colecta ("vaca") con meta, fecha límite (timestamp Unix en segundos),
    /// token de aporte (por ejemplo XLM o USDC) y beneficiario.
    pub fn __constructor(
        env: Env,
        organizer: Address,
        beneficiary: Address,
        token: Address,
        title: String,
        goal: i128,
        deadline: u64,
    ) {
        organizer.require_auth();

        if goal <= 0 {
            panic_with_error!(&env, Error::InvalidGoal);
        }
        if deadline <= env.ledger().timestamp() {
            panic_with_error!(&env, Error::InvalidDeadline);
        }

        let config = VacaConfig {
            title,
            organizer: organizer.clone(),
            beneficiary: beneficiary.clone(),
            token,
            goal,
            deadline,
        };

        env.storage().instance().set(&DataKey::Config, &config);
        env.storage().instance().set(&DataKey::TotalRaised, &0i128);
        env.storage().instance().set(&DataKey::Claimed, &false);
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_BUMP_THRESHOLD, INSTANCE_BUMP_TO);

        VacaCreated {
            organizer,
            beneficiary,
            goal,
            deadline,
        }
        .publish(&env);
    }

    /// Permite a cualquier participante aportar a la vaca antes de la fecha límite.
    pub fn contribute(env: Env, contributor: Address, amount: i128) -> Result<i128, Error> {
        contributor.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let config = Self::load_config(&env)?;
        if env.ledger().timestamp() >= config.deadline {
            return Err(Error::DeadlinePassed);
        }

        let claimed: bool = env
            .storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false);
        if claimed {
            return Err(Error::AlreadyClaimed);
        }

        let token_client = token::Client::new(&env, &config.token);
        token_client.transfer(&contributor, &env.current_contract_address(), &amount);

        let key = DataKey::Contribution(contributor.clone());
        let previous: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let updated_contribution = previous.checked_add(amount).ok_or(Error::Overflow)?;
        env.storage().persistent().set(&key, &updated_contribution);
        env.storage()
            .persistent()
            .extend_ttl(&key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_TO);

        let total_raised: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0);
        let new_total = total_raised.checked_add(amount).ok_or(Error::Overflow)?;
        env.storage()
            .instance()
            .set(&DataKey::TotalRaised, &new_total);
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_BUMP_THRESHOLD, INSTANCE_BUMP_TO);

        Contributed {
            contributor,
            amount,
            total_raised: new_total,
        }
        .publish(&env);

        Ok(new_total)
    }

    /// Permite al beneficiario retirar el total recaudado si se alcanzó la meta.
    pub fn claim(env: Env) -> Result<i128, Error> {
        let config = Self::load_config(&env)?;
        config.beneficiary.require_auth();

        let claimed: bool = env
            .storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false);
        if claimed {
            return Err(Error::AlreadyClaimed);
        }

        let total_raised: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0);
        if total_raised < config.goal {
            return Err(Error::GoalNotReached);
        }

        env.storage().instance().set(&DataKey::Claimed, &true);
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_BUMP_THRESHOLD, INSTANCE_BUMP_TO);

        let token_client = token::Client::new(&env, &config.token);
        token_client.transfer(
            &env.current_contract_address(),
            &config.beneficiary,
            &total_raised,
        );

        Claimed {
            beneficiary: config.beneficiary,
            total_raised,
        }
        .publish(&env);

        Ok(total_raised)
    }

    /// Si venció el plazo sin alcanzar la meta, cada participante puede recuperar su aporte.
    pub fn refund(env: Env, contributor: Address) -> Result<i128, Error> {
        contributor.require_auth();

        let config = Self::load_config(&env)?;
        let claimed: bool = env
            .storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false);
        if claimed {
            return Err(Error::AlreadyClaimed);
        }

        if env.ledger().timestamp() < config.deadline {
            return Err(Error::DeadlineNotReached);
        }

        let total_raised: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0);
        if total_raised >= config.goal {
            return Err(Error::GoalAlreadyReached);
        }

        let key = DataKey::Contribution(contributor.clone());
        let contributed: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        if contributed <= 0 {
            return Err(Error::NothingToRefund);
        }

        env.storage().persistent().remove(&key);
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_BUMP_THRESHOLD, INSTANCE_BUMP_TO);

        let token_client = token::Client::new(&env, &config.token);
        token_client.transfer(&env.current_contract_address(), &contributor, &contributed);

        Refunded {
            contributor,
            amount: contributed,
        }
        .publish(&env);

        Ok(contributed)
    }

    /// Devuelve el estado general de la vaca.
    pub fn get_status(env: Env) -> Result<VacaStatus, Error> {
        let config = Self::load_config(&env)?;
        let total_raised: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRaised)
            .unwrap_or(0);
        let claimed: bool = env
            .storage()
            .instance()
            .get(&DataKey::Claimed)
            .unwrap_or(false);

        Ok(VacaStatus {
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

    /// Devuelve cuánto ha aportado una dirección específica.
    pub fn get_contribution(env: Env, contributor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(contributor))
            .unwrap_or(0)
    }

    fn load_config(env: &Env) -> Result<VacaConfig, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(Error::NotInitialized)
    }
}

mod test;
