import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock,
  Coins,
  Droplets,
  ExternalLink,
  LogOut,
  PlusCircle,
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
  createNewVaca,
  EXPLORER_CONTRACT_URL,
  fetchAllVacas,
  fetchUserContributions,
  formatXlm,
  fundTestnetAccount,
  refundVaca,
  shortenAddress,
  STELLAR_LAB_URL,
  type VacaStatusView,
} from "./lib/vacaContract";
import { useStellarWallet } from "./hooks/useStellarWallet";

function formatDeadline(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  if (!Number.isFinite(unixSeconds) || Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function App() {
  const wallet = useStellarWallet();
  const [vacas, setVacas] = useState<VacaStatusView[]>([]);
  const [loadingVacas, setLoadingVacas] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [contributions, setContributions] = useState<Record<number, number>>({});
  const [isFunded, setIsFunded] = useState<boolean>(true);
  const [funding, setFunding] = useState(false);

  // Create new vaca form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBeneficiary, setNewBeneficiary] = useState("");
  const [newGoalXlm, setNewGoalXlm] = useState("10");
  const [newDays, setNewDays] = useState("7");

  // Per-vaca contribution input
  const [amounts, setAmounts] = useState<Record<number, string>>({});

  const [txBusy, setTxBusy] = useState(false);
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const titleId = useId();
  const beneficiaryId = useId();
  const goalId = useId();
  const daysId = useId();

  const loadVacas = useCallback(async () => {
    setLoadingVacas(true);
    setLoadError(null);
    try {
      const list = await fetchAllVacas();
      setVacas(list);
      return list;
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "No se pudo consultar el contrato en Soroban Testnet."
      );
      return [];
    } finally {
      setLoadingVacas(false);
    }
  }, []);

  const loadWalletExtras = useCallback(
    async (addr: string, currentVacas: VacaStatusView[]) => {
      try {
        const [funded, contribs] = await Promise.all([
          checkAccountFunded(addr),
          fetchUserContributions(
            addr,
            currentVacas.map((v) => v.id)
          ),
        ]);
        setIsFunded(funded);
        setContributions(contribs);
      } catch {
        // Keep UI responsive on transient RPC errors
      }
    },
    []
  );

  useEffect(() => {
    void loadVacas();
  }, [loadVacas]);

  useEffect(() => {
    if (!wallet.address) {
      setContributions({});
      setIsFunded(true);
      return;
    }
    if (!newBeneficiary) {
      setNewBeneficiary(wallet.address);
    }
    void loadWalletExtras(wallet.address, vacas);
  }, [wallet.address, vacas, newBeneficiary, loadWalletExtras]);

  const handleRefresh = async () => {
    const list = await loadVacas();
    if (wallet.address) {
      await loadWalletExtras(wallet.address, list);
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

  const handleCreateVaca = async (e: FormEvent) => {
    e.preventDefault();
    if (!wallet.address || txBusy) return;
    setTxBusy(true);
    setTxError(null);
    setTxHash(null);
    setTxMessage("Creando nueva vaca en Soroban Testnet (firma en tu wallet)…");
    try {
      const { vacaId, hash } = await createNewVaca(
        {
          organizer: wallet.address,
          beneficiary: newBeneficiary || wallet.address,
          title: newTitle,
          goalXlm: newGoalXlm,
          days: Number(newDays) || 7,
        },
        wallet.signTransaction
      );
      setTxHash(hash || null);
      setTxMessage(`¡Vaca #${vacaId} "${newTitle}" creada en Stellar Testnet!`);
      setNewTitle("");
      setShowCreateForm(false);
      await handleRefresh();
    } catch (err) {
      setTxMessage(null);
      setTxError(err instanceof Error ? err.message : "No se pudo crear la vaca.");
    } finally {
      setTxBusy(false);
    }
  };

  const handleContribute = async (vacaId: number, e: FormEvent) => {
    e.preventDefault();
    if (!wallet.address || txBusy) return;
    const amount = amounts[vacaId] ?? "1";
    setTxBusy(true);
    setTxError(null);
    setTxHash(null);
    setTxMessage(`Aportando ${amount} XLM a la vaca #${vacaId}…`);
    try {
      const hash = await contributeToVaca(
        vacaId,
        wallet.address,
        amount,
        wallet.signTransaction
      );
      setTxHash(hash || null);
      setTxMessage(`¡Aporte de ${amount} XLM confirmado en la vaca #${vacaId}!`);
      await handleRefresh();
    } catch (err) {
      setTxMessage(null);
      setTxError(err instanceof Error ? err.message : "Error al aportar.");
    } finally {
      setTxBusy(false);
    }
  };

  const handleClaim = async (vacaId: number) => {
    if (!wallet.address || txBusy) return;
    setTxBusy(true);
    setTxError(null);
    setTxHash(null);
    setTxMessage(`Reclamando fondos de la vaca #${vacaId}…`);
    try {
      const hash = await claimVaca(vacaId, wallet.address, wallet.signTransaction);
      setTxHash(hash || null);
      setTxMessage(`¡Fondos de la vaca #${vacaId} retirados con éxito!`);
      await handleRefresh();
    } catch (err) {
      setTxMessage(null);
      setTxError(err instanceof Error ? err.message : "No se pudo reclamar.");
    } finally {
      setTxBusy(false);
    }
  };

  const handleRefund = async (vacaId: number) => {
    if (!wallet.address || txBusy) return;
    setTxBusy(true);
    setTxError(null);
    setTxHash(null);
    setTxMessage(`Solicitando reembolso de la vaca #${vacaId}…`);
    try {
      const hash = await refundVaca(vacaId, wallet.address, wallet.signTransaction);
      setTxHash(hash || null);
      setTxMessage(`¡Reembolso de la vaca #${vacaId} completado!`);
      await handleRefresh();
    } catch (err) {
      setTxMessage(null);
      setTxError(err instanceof Error ? err.message : "No se pudo reembolsar.");
    } finally {
      setTxBusy(false);
    }
  };

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
            <a href="#vacas-en-vivo" className="btn btn-primary">
              Ver colectas en vivo
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
            <h2>1. Creá tu vaca en segundos</h2>
            <p>
              Definí título, beneficiario, meta en XLM y fecha límite directamente sobre
              el contrato en Stellar Testnet.
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

        {/* Live Vacas + Create Vaca */}
        <section
          id="vacas-en-vivo"
          className="card live-card"
          aria-labelledby="live-title"
        >
          <div className="live-header">
            <div>
              <span className="eyebrow">Contrato en vivo · Stellar Testnet</span>
              <h2 id="live-title">Colectas Activas ({vacas.length})</h2>
            </div>

            <div className="action-row">
              {wallet.address && isFunded && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowCreateForm((prev) => !prev)}
                >
                  <PlusCircle size={15} aria-hidden="true" />
                  {showCreateForm ? "Cerrar formulario" : "Crear nueva vaca"}
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRefresh}
                disabled={loadingVacas}
              >
                <RefreshCw
                  size={14}
                  className={loadingVacas ? "spin" : undefined}
                  aria-hidden="true"
                />
                Actualizar
              </button>
            </div>
          </div>

          <div className="contract-meta">
            <span>
              <strong>Contract ID:</strong>{" "}
              <a href={EXPLORER_CONTRACT_URL} target="_blank" rel="noreferrer">
                <code>{shortenAddress(CONTRACT_ID, 8, 8)}</code>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </span>
          </div>

          {wallet.error && (
            <div className="alert alert-error" role="alert">
              <span>{wallet.error}</span>
              <button type="button" className="btn-link" onClick={wallet.clearError}>
                Cerrar
              </button>
            </div>
          )}

          {loadError && (
            <div className="alert alert-error" role="alert">
              {loadError}
            </div>
          )}

          {!wallet.address ? (
            <div className="connect-prompt">
              <p>
                Conecta tu wallet en <strong>Stellar Testnet</strong> (Freighter /
                Varial, xBull o Albedo) para <strong>crear vacas nuevas</strong> o
                aportar XLM.
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
            <div className="user-summary-bar">
              <span>
                Wallet conectada ({wallet.walletName}):{" "}
                <code>{shortenAddress(wallet.address, 6, 5)}</code>
              </span>
              {!isFunded && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleFund}
                  disabled={funding}
                >
                  <Droplets size={15} aria-hidden="true" />
                  {funding ? "Fondeando…" : "Fondear cuenta con Friendbot"}
                </button>
              )}
            </div>
          )}

          {showCreateForm && wallet.address && isFunded && (
            <form className="create-form" onSubmit={handleCreateVaca}>
              <h3>Nueva Colecta en Stellar Testnet</h3>
              <div className="create-grid">
                <div className="field">
                  <label htmlFor={titleId}>Nombre de la vaca</label>
                  <input
                    id={titleId}
                    type="text"
                    required
                    maxLength={40}
                    placeholder="Ej. Paseo a Manuel Antonio"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    disabled={txBusy}
                  />
                </div>

                <div className="field">
                  <label htmlFor={beneficiaryId}>Beneficiario (G…)</label>
                  <input
                    id={beneficiaryId}
                    type="text"
                    required
                    value={newBeneficiary}
                    onChange={(e) => setNewBeneficiary(e.target.value.trim())}
                    disabled={txBusy}
                  />
                </div>

                <div className="field">
                  <label htmlFor={goalId}>Meta (XLM)</label>
                  <input
                    id={goalId}
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={newGoalXlm}
                    onChange={(e) => setNewGoalXlm(e.target.value)}
                    disabled={txBusy}
                  />
                </div>

                <div className="field">
                  <label htmlFor={daysId}>Plazo (días)</label>
                  <input
                    id={daysId}
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={newDays}
                    onChange={(e) => setNewDays(e.target.value)}
                    disabled={txBusy}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={txBusy}>
                <PlusCircle size={16} aria-hidden="true" />
                {txBusy ? "Creando en Soroban…" : "Crear Vaca en Testnet"}
              </button>
            </form>
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

          {loadingVacas && vacas.length === 0 ? (
            <p className="hint">Cargando colectas desde Soroban Testnet…</p>
          ) : (
            <div className="vacas-list">
              {vacas.map((vaca) => {
                const pct = Math.min(
                  100,
                  Math.round((vaca.totalRaisedXlm / vaca.goalXlm) * 100)
                );
                const myContrib = contributions[vaca.id] ?? 0;
                const isBeneficiary =
                  Boolean(wallet.address) && wallet.address === vaca.beneficiary;
                const canRefund =
                  Boolean(wallet.address) &&
                  !vaca.isOpen &&
                  !vaca.goalReached &&
                  !vaca.claimed &&
                  myContrib > 0;

                return (
                  <article key={vaca.id} className="progress-panel vaca-item">
                    <div className="vaca-top">
                      <div>
                        <span className="eyebrow">Vaca #{vaca.id}</span>
                        <h3>{vaca.title}</h3>
                      </div>
                      <span className="hint clock-line">
                        <Clock size={14} aria-hidden="true" />
                        Cierre: {formatDeadline(vaca.deadlineUnix)}
                      </span>
                    </div>

                    <div className="progress-numbers">
                      <div>
                        <span className="label">Recaudado</span>
                        <p className="big-xlm">{formatXlm(vaca.totalRaisedXlm)} XLM</p>
                      </div>
                      <div className="align-end">
                        <span className="label">Meta</span>
                        <p className="goal-xlm">
                          {formatXlm(vaca.goalXlm)} XLM ({pct}%)
                        </p>
                      </div>
                    </div>

                    <div
                      className="progress-track"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progreso de ${vaca.title}`}
                    >
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="status-badges">
                      <span
                        className={`badge ${vaca.isOpen ? "badge-success" : "badge-muted"}`}
                      >
                        {vaca.isOpen ? "Abierta" : "Cerrada"}
                      </span>
                      {vaca.goalReached && (
                        <span className="badge badge-success">Meta alcanzada</span>
                      )}
                      {vaca.claimed && (
                        <span className="badge badge-info">Fondos reclamados</span>
                      )}
                      <span className="hint">
                        Beneficiario: <code>{shortenAddress(vaca.beneficiary, 6, 4)}</code>
                      </span>
                      {wallet.address && (
                        <span className="hint">
                          Tu aporte: <strong>{formatXlm(myContrib)} XLM</strong>
                        </span>
                      )}
                    </div>

                    {wallet.address && isFunded && (
                      <div className="vaca-actions">
                        {vaca.isOpen && (
                          <form
                            className="inline-row"
                            onSubmit={(e) => handleContribute(vaca.id, e)}
                          >
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              required
                              aria-label={`Monto en XLM para ${vaca.title}`}
                              value={amounts[vaca.id] ?? "1"}
                              onChange={(e) =>
                                setAmounts((prev) => ({
                                  ...prev,
                                  [vaca.id]: e.target.value,
                                }))
                              }
                              disabled={txBusy}
                            />
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm"
                              disabled={txBusy}
                            >
                              <Send size={14} aria-hidden="true" />
                              Aportar XLM
                            </button>
                          </form>
                        )}

                        {isBeneficiary && vaca.goalReached && !vaca.claimed && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => handleClaim(vaca.id)}
                            disabled={txBusy}
                          >
                            <CheckCircle2 size={14} aria-hidden="true" />
                            Reclamar fondos
                          </button>
                        )}

                        {canRefund && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRefund(vaca.id)}
                            disabled={txBusy}
                          >
                            <RotateCcw size={14} aria-hidden="true" />
                            Solicitar reembolso
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
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
