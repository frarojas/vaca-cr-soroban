import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock,
  Coins,
  Droplets,
  ExternalLink,
  LogOut,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  checkAccountFunded,
  claimVaca,
  CONTRACT_ID,
  contributeToVaca,
  EXPLORER_CONTRACT_URL,
  fetchUserContribution,
  fetchVacaStatus,
  formatXlm,
  fundTestnetAccount,
  refundVaca,
  shortenAddress,
  STELLAR_LAB_URL,
  type VacaStatusView,
} from "./lib/vacaContract";
import { useStellarWallet } from "./hooks/useStellarWallet";

function formatDeadline(unixSeconds: number): string {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(unixSeconds * 1000));
}

export function App() {
  const wallet = useStellarWallet();
  const [status, setStatus] = useState<VacaStatusView | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [userContribution, setUserContribution] = useState<number>(0);
  const [isFunded, setIsFunded] = useState<boolean>(true);
  const [funding, setFunding] = useState(false);

  const [amountXlm, setAmountXlm] = useState("1");
  const [txBusy, setTxBusy] = useState(false);
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const amountId = useId();
  const amountHintId = useId();

  const loadContractState = useCallback(async () => {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const nextStatus = await fetchVacaStatus();
      setStatus(nextStatus);
    } catch (err) {
      setStatusError(
        err instanceof Error
          ? err.message
          : "No se pudo consultar el contrato en Soroban Testnet."
      );
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadWalletExtras = useCallback(async (addr: string) => {
    try {
      const [funded, contrib] = await Promise.all([
        checkAccountFunded(addr),
        fetchUserContribution(addr),
      ]);
      setIsFunded(funded);
      setUserContribution(contrib);
    } catch {
      // Keep UI responsive on transient RPC errors
    }
  }, []);

  useEffect(() => {
    void loadContractState();
  }, [loadContractState]);

  useEffect(() => {
    if (!wallet.address) {
      setUserContribution(0);
      setIsFunded(true);
      return;
    }
    void loadWalletExtras(wallet.address);
  }, [wallet.address, loadWalletExtras]);

  const handleRefresh = async () => {
    await loadContractState();
    if (wallet.address) {
      await loadWalletExtras(wallet.address);
    }
  };

  const handleFund = async () => {
    if (!wallet.address) return;
    setFunding(true);
    setTxError(null);
    try {
      await fundTestnetAccount(wallet.address);
      setIsFunded(true);
      setTxMessage("Cuenta fondeada con Friendbot (+10,000 XLM en Testnet).");
    } catch (err) {
      setTxError(err instanceof Error ? err.message : "Error con Friendbot.");
    } finally {
      setFunding(false);
    }
  };

  const handleContribute = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet.address || txBusy) return;
    setTxBusy(true);
    setTxError(null);
    setTxHash(null);
    setTxMessage("Simulando y solicitando firma en tu wallet…");
    try {
      const hash = await contributeToVaca(
        wallet.address,
        amountXlm,
        wallet.signTransaction
      );
      setTxHash(hash || null);
      setTxMessage(`¡Aporte de ${amountXlm} XLM confirmado en Soroban Testnet!`);
      await handleRefresh();
    } catch (err) {
      setTxMessage(null);
      setTxError(err instanceof Error ? err.message : "Error al aportar.");
    } finally {
      setTxBusy(false);
    }
  };

  const handleClaim = async () => {
    if (!wallet.address || txBusy) return;
    setTxBusy(true);
    setTxError(null);
    setTxHash(null);
    setTxMessage("Reclamando fondos de la vaca…");
    try {
      const hash = await claimVaca(wallet.address, wallet.signTransaction);
      setTxHash(hash || null);
      setTxMessage("¡Fondos retirados con éxito por el beneficiario!");
      await handleRefresh();
    } catch (err) {
      setTxMessage(null);
      setTxError(err instanceof Error ? err.message : "No se pudo reclamar.");
    } finally {
      setTxBusy(false);
    }
  };

  const handleRefund = async () => {
    if (!wallet.address || txBusy) return;
    setTxBusy(true);
    setTxError(null);
    setTxHash(null);
    setTxMessage("Solicitando reembolso al contrato…");
    try {
      const hash = await refundVaca(wallet.address, wallet.signTransaction);
      setTxHash(hash || null);
      setTxMessage("¡Reembolso completado!");
      await handleRefresh();
    } catch (err) {
      setTxMessage(null);
      setTxError(err instanceof Error ? err.message : "No se pudo reembolsar.");
    } finally {
      setTxBusy(false);
    }
  };

  const progressPct = status
    ? Math.min(100, Math.round((status.totalRaisedXlm / status.goalXlm) * 100))
    : 0;
  const isBeneficiary =
    Boolean(wallet.address) && wallet.address === status?.beneficiary;
  const canRefund =
    Boolean(status) &&
    !status!.isOpen &&
    !status!.goalReached &&
    !status!.claimed &&
    userContribution > 0;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-badge" aria-hidden="true">
            <Coins size={20} />
          </span>
          <div>
            <strong>VacaCR</strong>
            <span className="brand-sub">Soroban Smart Contract · Stellar Testnet</span>
          </div>
        </div>

        <div className="topbar-actions">
          <a
            href="https://github.com/frarojas/vaca-cr-soroban"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            GitHub
            <ExternalLink size={14} aria-hidden="true" />
          </a>

          {!wallet.address ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={wallet.connect}
              disabled={wallet.isConnecting}
            >
              <Wallet size={15} aria-hidden="true" />
              {wallet.isConnecting ? "Conectando…" : "Conectar Wallet"}
            </button>
          ) : (
            <div className="wallet-chip">
              <span>{shortenAddress(wallet.address, 5, 4)}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={wallet.disconnect}
                aria-label="Desconectar wallet"
                title="Desconectar wallet"
              >
                <LogOut size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        {/* Hero Landing */}
        <section className="hero">
          <span className="pill">
            <Sparkles size={14} aria-hidden="true" />
            Costa Rica · De la vaca por SINPE a un Escrow en Stellar
          </span>
          <h1>
            Hacé la vaca con tus compas sin enredos, con transparencia total en{" "}
            <span className="accent">Stellar</span>
          </h1>
          <p className="hero-lead">
            En Costa Rica hacemos "vaca" para la mejenga, el paseo o un regalo, pero
            nadie sabe cuánto falta ni qué pasa si no se llega a la meta.{" "}
            <strong>VacaCR</strong> es un contrato inteligente en Soroban que guarda los
            fondos de forma neutral: si se cumple la meta cobra el beneficiario; si vence
            el plazo, cada persona recupera su aporte.
          </p>

          <div className="hero-cta">
            <a href="#demo-en-vivo" className="btn btn-primary">
              Ver colecta en vivo
            </a>
            <a
              href={STELLAR_LAB_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
            >
              Inspeccionar en Stellar Lab
              <ExternalLink size={15} aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Problem vs Solution */}
        <section className="grid-3" aria-label="Cómo resuelve el problema">
          <article className="card mini-card">
            <Users size={20} className="card-icon" aria-hidden="true" />
            <h2>1. Meta y estado visibles</h2>
            <p>
              Cualquier persona puede consultar en vivo cuánto se ha recaudado y cuánto
              falta sin andar preguntando en el chat.
            </p>
          </article>

          <article className="card mini-card">
            <ShieldCheck size={20} className="card-icon" aria-hidden="true" />
            <h2>2. Custodia en el contrato</h2>
            <p>
              Los XLM quedan bloqueados en el contrato inteligente hasta que se cumpla la
              meta o venza el plazo, sin mezclarse en cuentas personales.
            </p>
          </article>

          <article className="card mini-card">
            <RotateCcw size={20} className="card-icon" aria-hidden="true" />
            <h2>3. Reembolso garantizado</h2>
            <p>
              Si llega la fecha límite y no se reunió la meta, cada participante retira
              exactamente su aporte desde el contrato.
            </p>
          </article>
        </section>

        {/* Live Contract Dashboard */}
        <section id="demo-en-vivo" className="card live-card" aria-labelledby="live-title">
          <div className="live-header">
            <div>
              <span className="eyebrow">Contrato en vivo · Stellar Testnet</span>
              <h2 id="live-title">
                {loadingStatus && !status
                  ? "Cargando colecta desde Soroban…"
                  : status?.title ?? "Colecta VacaCR"}
              </h2>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRefresh}
              disabled={loadingStatus}
            >
              <RefreshCw
                size={14}
                className={loadingStatus ? "spin" : undefined}
                aria-hidden="true"
              />
              Actualizar
            </button>
          </div>

          <div className="contract-meta">
            <span>
              <strong>Contract ID:</strong>{" "}
              <a href={EXPLORER_CONTRACT_URL} target="_blank" rel="noreferrer">
                <code>{shortenAddress(CONTRACT_ID, 8, 8)}</code>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </span>
            {status && (
              <span>
                <Clock size={14} aria-hidden="true" />
                Cierre: {formatDeadline(status.deadlineUnix)}
              </span>
            )}
          </div>

          {statusError && (
            <div className="alert alert-error" role="alert">
              {statusError}
            </div>
          )}

          {wallet.error && (
            <div className="alert alert-error" role="alert">
              <span>{wallet.error}</span>
              <button type="button" className="btn-link" onClick={wallet.clearError}>
                Cerrar
              </button>
            </div>
          )}

          {status && (
            <>
              <div className="progress-panel">
                <div className="progress-numbers">
                  <div>
                    <span className="label">Recaudado</span>
                    <p className="big-xlm">{formatXlm(status.totalRaisedXlm)} XLM</p>
                  </div>
                  <div className="align-end">
                    <span className="label">Meta</span>
                    <p className="goal-xlm">
                      {formatXlm(status.goalXlm)} XLM ({progressPct}%)
                    </p>
                  </div>
                </div>

                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progreso de la colecta"
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                <div className="status-badges">
                  <span
                    className={`badge ${status.isOpen ? "badge-success" : "badge-muted"}`}
                  >
                    {status.isOpen ? "Colecta abierta" : "Plazo cerrado"}
                  </span>
                  {status.goalReached && (
                    <span className="badge badge-success">Meta alcanzada</span>
                  )}
                  {status.claimed && (
                    <span className="badge badge-info">Fondos reclamados</span>
                  )}
                  <span className="hint">
                    Beneficiario: <code>{shortenAddress(status.beneficiary, 6, 5)}</code>
                  </span>
                </div>
              </div>

              {/* Wallet interaction area */}
              <div className="interact-box">
                {!wallet.address ? (
                  <div className="connect-prompt">
                    <p>
                      Conecta tu wallet de Stellar en <strong>Testnet</strong> (Freighter /
                      Varial, xBull o Albedo) para aportar a esta vaca en vivo.
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={wallet.connect}
                      disabled={wallet.isConnecting}
                    >
                      <Wallet size={17} aria-hidden="true" />
                      {wallet.isConnecting ? "Abriendo selector…" : "Conectar Wallet"}
                    </button>
                  </div>
                ) : (
                  <div className="interact-connected">
                    <div className="user-summary">
                      <span>
                        Conectado ({wallet.walletName}):{" "}
                        <code>{shortenAddress(wallet.address, 6, 5)}</code>
                      </span>
                      <span>
                        Tu aporte actual:{" "}
                        <strong>{formatXlm(userContribution)} XLM</strong>
                      </span>
                    </div>

                    {!isFunded && (
                      <div className="alert alert-info">
                        <span>Tu cuenta aún no está activada en Stellar Testnet.</span>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleFund}
                          disabled={funding}
                        >
                          <Droplets size={15} aria-hidden="true" />
                          {funding ? "Fondeando…" : "Fondear con Friendbot"}
                        </button>
                      </div>
                    )}

                    {status.isOpen && isFunded && (
                      <form className="contribute-form" onSubmit={handleContribute}>
                        <div className="field">
                          <label htmlFor={amountId}>Aportar a la vaca (XLM)</label>
                          <span id={amountHintId} className="hint">
                            Se ejecuta <code>contribute</code> directamente sobre el
                            contrato en Soroban Testnet.
                          </span>
                          <div className="inline-row">
                            <input
                              id={amountId}
                              type="number"
                              min="0.1"
                              step="any"
                              required
                              value={amountXlm}
                              onChange={(e) => setAmountXlm(e.target.value)}
                              aria-describedby={amountHintId}
                              disabled={txBusy}
                            />
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={txBusy}
                            >
                              <Send size={16} aria-hidden="true" />
                              {txBusy ? "Procesando…" : "Aportar XLM"}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    <div className="action-row">
                      {isBeneficiary && status.goalReached && !status.claimed && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleClaim}
                          disabled={txBusy}
                        >
                          <CheckCircle2 size={16} aria-hidden="true" />
                          Reclamar fondos (Beneficiario)
                        </button>
                      )}

                      {canRefund && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleRefund}
                          disabled={txBusy}
                        >
                          <RotateCcw size={16} aria-hidden="true" />
                          Solicitar reembolso
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {txMessage && (
                  <div className="alert alert-success" role="status">
                    <span>{txMessage}</span>
                    {txHash && (
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-link"
                      >
                        Ver tx
                        <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}

                {txError && (
                  <div className="alert alert-error" role="alert">
                    {txError}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>
          <strong>VacaCR</strong> · Proyecto práctico de contrato inteligente en Soroban ·
          Franco Vinicio Rojas Lagos · Pura Vida Bootcamp
        </p>
      </footer>
    </div>
  );
}
