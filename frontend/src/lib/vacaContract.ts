import * as StellarSdk from "@stellar/stellar-sdk";
import { contract } from "@stellar/stellar-sdk";

export const CONTRACT_ID =
  "CAHS6XCJDVRZ7JOAQ7CV5CSBUJGGSWMSXDDUDMTQJSDXH4TDYX2FSHEP";
export const NATIVE_XLM_SAC =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
export const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
export const TESTNET_HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const STELLAR_LAB_URL = `https://lab.stellar.org/r/testnet/contract/${CONTRACT_ID}`;
export const EXPLORER_CONTRACT_URL = `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;

const READ_ONLY_SOURCE =
  "GCJLYYUL76PUNEYTUMAQHDUHZQEVGUDODZVDE2H6ZFN3KWH4OCUQ5UKS";

export interface RawVacaStatus {
  id: bigint;
  title: string;
  organizer: string;
  beneficiary: string;
  token: string;
  goal: bigint;
  deadline: bigint;
  total_raised: bigint;
  claimed: boolean;
  goal_reached: boolean;
  is_open: boolean;
}

export interface VacaStatusView {
  id: number;
  title: string;
  organizer: string;
  beneficiary: string;
  token: string;
  goalXlm: number;
  totalRaisedXlm: number;
  deadlineUnix: number;
  claimed: boolean;
  goalReached: boolean;
  isOpen: boolean;
}

interface VacaContractMethods {
  get_vaca_count: (
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
  get_status: (
    args: { vaca_id: bigint },
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<RawVacaStatus>>;
  get_contribution: (
    args: { vaca_id: bigint; contributor: string },
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
  create_vaca: (
    args: {
      organizer: string;
      beneficiary: string;
      token: string;
      title: string;
      goal: bigint;
      deadline: bigint;
    },
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
  contribute: (
    args: { vaca_id: bigint; contributor: string; amount: bigint },
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
  claim: (
    args: { vaca_id: bigint },
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
  refund: (
    args: { vaca_id: bigint; contributor: string },
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
}

export const STROOPS_PER_XLM = 10_000_000;

export function stroopsToXlm(stroops: bigint): number {
  return Number(stroops) / STROOPS_PER_XLM;
}

export function xlmToStroops(xlm: string): bigint {
  const num = Number(xlm);
  if (!Number.isFinite(num) || num <= 0) {
    throw new Error("Ingresa un monto en XLM mayor que 0.");
  }
  return BigInt(Math.round(num * STROOPS_PER_XLM));
}

export function formatXlm(xlm: number): string {
  return new Intl.NumberFormat("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(xlm);
}

export function shortenAddress(address: string, head = 6, tail = 6): string {
  if (address.length <= head + tail + 3) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function isValidStellarAddress(address: string): boolean {
  return StellarSdk.StrKey.isValidEd25519PublicKey(address.trim());
}

type MaybeContractResult<T> =
  | T
  | {
      isOk?: () => boolean;
      isErr?: () => boolean;
      unwrap?: () => T;
      unwrapErr?: () => unknown;
      value?: T;
    };

function unwrapContractResult<T>(res: MaybeContractResult<T>): T {
  if (res && typeof res === "object") {
    const candidate = res as {
      isErr?: () => boolean;
      unwrap?: () => T;
      unwrapErr?: () => unknown;
      value?: T;
    };
    if (typeof candidate.isErr === "function" && candidate.isErr()) {
      const errVal =
        typeof candidate.unwrapErr === "function"
          ? candidate.unwrapErr()
          : "Error del contrato";
      throw new Error(String(errVal));
    }
    if (typeof candidate.unwrap === "function") {
      return candidate.unwrap();
    }
    if ("value" in candidate && candidate.value !== undefined) {
      return candidate.value;
    }
  }
  return res as T;
}

async function getContractClient(
  publicKey?: string,
  signTransaction?: contract.ClientOptions["signTransaction"]
) {
  return contract.Client.from<VacaContractMethods>({
    contractId: CONTRACT_ID,
    rpcUrl: TESTNET_RPC_URL,
    networkPassphrase: NETWORK_PASSPHRASE,
    publicKey: publicKey ?? READ_ONLY_SOURCE,
    signTransaction,
  });
}

function mapStatus(raw: RawVacaStatus): VacaStatusView {
  return {
    id: Number(raw.id),
    title: raw.title,
    organizer: raw.organizer,
    beneficiary: raw.beneficiary,
    token: raw.token,
    goalXlm: stroopsToXlm(raw.goal),
    totalRaisedXlm: stroopsToXlm(raw.total_raised),
    deadlineUnix: Number(raw.deadline),
    claimed: raw.claimed,
    goalReached: raw.goal_reached,
    isOpen: raw.is_open,
  };
}

export async function fetchAllVacas(): Promise<VacaStatusView[]> {
  const client = await getContractClient();
  const countTx = await client.get_vaca_count();
  const count = Number(unwrapContractResult<bigint>(countTx.result));
  if (count <= 0) return [];

  const ids = Array.from({ length: count }, (_, idx) => BigInt(count - idx));
  const results = await Promise.all(
    ids.map(async (vacaId) => {
      const tx = await client.get_status({ vaca_id: vacaId });
      return mapStatus(unwrapContractResult<RawVacaStatus>(tx.result));
    })
  );

  return results;
}

export async function fetchUserContributions(
  address: string,
  vacaIds: number[]
): Promise<Record<number, number>> {
  if (vacaIds.length === 0) return {};
  const client = await getContractClient(address);
  const entries = await Promise.all(
    vacaIds.map(async (id) => {
      const tx = await client.get_contribution({
        vaca_id: BigInt(id),
        contributor: address,
      });
      return [id, stroopsToXlm(unwrapContractResult<bigint>(tx.result))] as const;
    })
  );
  return Object.fromEntries(entries);
}

export async function createNewVaca(
  params: {
    organizer: string;
    beneficiary: string;
    title: string;
    goalXlm: string;
    days: number;
  },
  signTransaction: contract.ClientOptions["signTransaction"]
): Promise<{ vacaId: number; hash: string }> {
  if (!isValidStellarAddress(params.beneficiary)) {
    throw new Error("La dirección del beneficiario debe ser una llave Stellar válida (G…).");
  }
  const title = params.title.trim();
  if (!title) {
    throw new Error("Ingresa un nombre para la vaca.");
  }
  const goal = xlmToStroops(params.goalXlm);
  const days = Math.max(1, Math.min(365, Math.floor(params.days)));
  const deadline = BigInt(Math.floor(Date.now() / 1000) + days * 86_400);

  const client = await getContractClient(params.organizer, signTransaction);
  const tx = await client.create_vaca({
    organizer: params.organizer,
    beneficiary: params.beneficiary.trim(),
    token: NATIVE_XLM_SAC,
    title,
    goal,
    deadline,
  });
  const sent = await tx.signAndSend();
  const vacaId = Number(unwrapContractResult<bigint>(sent.result));
  return {
    vacaId,
    hash: sent.sendTransactionResponse?.hash ?? "",
  };
}

export async function contributeToVaca(
  vacaId: number,
  address: string,
  amountXlm: string,
  signTransaction: contract.ClientOptions["signTransaction"]
): Promise<string> {
  const stroops = xlmToStroops(amountXlm);
  const client = await getContractClient(address, signTransaction);
  const tx = await client.contribute({
    vaca_id: BigInt(vacaId),
    contributor: address,
    amount: stroops,
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function claimVaca(
  vacaId: number,
  address: string,
  signTransaction: contract.ClientOptions["signTransaction"]
): Promise<string> {
  const client = await getContractClient(address, signTransaction);
  const tx = await client.claim({ vaca_id: BigInt(vacaId) });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function refundVaca(
  vacaId: number,
  address: string,
  signTransaction: contract.ClientOptions["signTransaction"]
): Promise<string> {
  const client = await getContractClient(address, signTransaction);
  const tx = await client.refund({
    vaca_id: BigInt(vacaId),
    contributor: address,
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function fundTestnetAccount(address: string): Promise<void> {
  const res = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`
  );
  if (!res.ok) {
    throw new Error("Friendbot no pudo fondear la cuenta. Intenta de nuevo.");
  }
}

export async function checkAccountFunded(address: string): Promise<boolean> {
  const horizon = new StellarSdk.Horizon.Server(TESTNET_HORIZON_URL);
  try {
    await horizon.loadAccount(address);
    return true;
  } catch (error) {
    if (error instanceof StellarSdk.NotFoundError) {
      return false;
    }
    return true;
  }
}
