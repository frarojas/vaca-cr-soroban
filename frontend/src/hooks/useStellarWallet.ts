import { useCallback, useEffect, useState } from "react";
import {
  KitEventType,
  Networks,
  StellarWalletsKit,
} from "@creit-tech/stellar-wallets-kit";
import { defaultModules } from "@creit-tech/stellar-wallets-kit/modules/utils";
import type { contract } from "@stellar/stellar-sdk";
import { NETWORK_PASSPHRASE } from "../lib/vacaContract";

let initialized = false;

function ensureKit() {
  if (initialized || typeof window === "undefined") return;
  StellarWalletsKit.init({
    modules: defaultModules(),
    network: Networks.TESTNET,
  });
  initialized = true;
}

export function useStellarWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureKit();

    const unsubState = StellarWalletsKit.on(
      KitEventType.STATE_UPDATED,
      (event) => {
        if (event.payload.address) {
          setAddress(event.payload.address);
          try {
            setWalletName(StellarWalletsKit.selectedModule.productName);
          } catch {
            setWalletName("Wallet conectada");
          }
        }
      }
    );

    const unsubDisconnect = StellarWalletsKit.on(
      KitEventType.DISCONNECT,
      () => {
        setAddress(null);
        setWalletName(null);
      }
    );

    return () => {
      unsubState();
      unsubDisconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    ensureKit();
    setError(null);
    setIsConnecting(true);
    try {
      const { address: connected } = await StellarWalletsKit.authModal();
      setAddress(connected);
      try {
        setWalletName(StellarWalletsKit.selectedModule.productName);
      } catch {
        setWalletName("Wallet conectada");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al conectar wallet.";
      if (!/closed|cancel/i.test(msg)) {
        setError(msg);
      }
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect();
    } catch {
      // Ignore disconnect errors
    }
    setAddress(null);
    setWalletName(null);
  }, []);

  const signTransaction: NonNullable<contract.ClientOptions["signTransaction"]> =
    useCallback(
      async (xdr: string) => {
      if (!address) {
        throw new Error("Conecta tu wallet primero.");
      }
      const { signedTxXdr, signerAddress } =
        await StellarWalletsKit.signTransaction(xdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address,
        });
      return {
        signedTxXdr,
        signerAddress: signerAddress ?? address,
      };
    },
    [address]
  );

  return {
    address,
    walletName,
    isConnecting,
    error,
    connect,
    disconnect,
    signTransaction,
    clearError: () => setError(null),
  };
}
