import * as StellarSdk from "@stellar/stellar-sdk";
import { contract } from "@stellar/stellar-sdk";

export const CONTRACT_ID =
  "CCBJUJLCPRXPZOUXHHYSVXX3WGCD3YG7DA3JT2U7GOECLOXV65LZBQ2N";
export const TESTNET_RPC_URL = "https://soroban-testnet.stellar.org";
export const TESTNET_HORIZON_URL = "https://horizon-testnet.stellar.org";
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const STELLAR_LAB_URL = `https://lab.stellar.org/r/testnet/contract/${CONTRACT_ID}`;
export const EXPLORER_CONTRACT_URL = `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`;

// Used only for read-only simulation when no wallet is connected yet.
const READ_ONLY_SOURCE =
  "GCJLYYUL76PUNEYTUMAQHDUHZQEVGUDODZVDE2H6ZFN3KWH4OCUQ5UKS";

export interface RawVacaStatus {
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
  get_status: (
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<RawVacaStatus>>;
  get_contribution: (
    args: { contributor: string },
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
  contribute: (
    args: { contributor: string; amount: bigint },
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
  claim: (
    options?: contract.MethodOptions
  ) => Promise<contract.AssembledTransaction<bigint>>;
  refund: (
    args: { contributor: string },
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

export async function fetchVacaStatus(): Promise<VacaStatusView> {
  const client = await getContractClient();
  const tx = await client.get_status();
  const raw = tx.result;

  return {
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

export async function fetchUserContribution(address: string): Promise<number> {
  const client = await getContractClient(address);
  const tx = await client.get_contribution({ contributor: address });
  return stroopsToXlm(tx.result);
}

export async function contributeToVaca(
  address: string,
  amountXlm: string,
  signTransaction: contract.ClientOptions["signTransaction"]
): Promise<string> {
  const stroops = xlmToStroops(amountXlm);
  const client = await getContractClient(address, signTransaction);
  const tx = await client.contribute({
    contributor: address,
    amount: stroops,
  });
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function claimVaca(
  address: string,
  signTransaction: contract.ClientOptions["signTransaction"]
): Promise<string> {
  const client = await getContractClient(address, signTransaction);
  const tx = await client.claim();
  const sent = await tx.signAndSend();
  return sent.sendTransactionResponse?.hash ?? "";
}

export async function refundVaca(
  address: string,
  signTransaction: contract.ClientOptions["signTransaction"]
): Promise<string> {
  const client = await getContractClient(address, signTransaction);
  const tx = await client.refund({ contributor: address });
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
