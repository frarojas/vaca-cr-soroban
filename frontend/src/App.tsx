import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FocusEvent,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
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
  fundTestnetAccount,
  isValidStellarAddress,
  NATIVE_XLM_SAC,
  refundVaca,
  shortenAddress,
  STELLAR_LAB_URL,
  type VacaStatusView,
} from "./lib/vacaContract";
import { useStellarWallet } from "./hooks/useStellarWallet";

const INITIAL_VACA: VacaStatusView = {
  id: 1,
  title: "MEJENGA DEL SÁBADO",
  organizer: "GCJLYYUL76PUNEYTUMAQHDUHZQEVGUDODZVDE2H6ZFN3KWH4OCUQ5UKS",
  beneficiary: "GCJLYYUL76PUNEYTUMAQHDUHZQEVGUDODZVDE2H6ZFN3KWH4OCUQ5UKS",
  token: NATIVE_XLM_SAC,
  goalXlm: 10,
  totalRaisedXlm: 1,
  deadlineUnix: 1798200000,
  claimed: false,
  goalReached: false,
  isOpen: true,
};

interface TxFeedback {
  kind: "success" | "error" | "info";
  message: string;
  txHash?: string;
}

interface CreateFormState {
  title: string;
  beneficiary: string;
  goalXlm: string;
  days: string;
}

interface CreateFormTouched {
  title: boolean;
  beneficiary: boolean;
  goalXlm: boolean;
  days: boolean;
}

function normalizeDisplayTitle(vaca: VacaStatusView): string {
  if (vaca.id === 1 && vaca.title.toLowerCase() === "mejenga del sabado") {
    return "MEJENGA DEL SÁBADO";
  }
  return vaca.title.toUpperCase();
}

function formatShortDate(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  if (!Number.isFinite(unixSeconds) || Number.isNaN(date.getTime())) {
    return "25 dic 2026";
  }
  const day = date.getUTCDate();
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${day} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function describeCountdown(deadlineUnix: number, nowUnix: number): string {
  const diff = deadlineUnix - nowUnix;
  if (diff <= 0) {
    const daysAgo = Math.max(1, Math.floor(Math.abs(diff) / 86_400));
    return `Plazo cerrado hace ${daysAgo} ${daysAgo === 1 ? "día" : "días"}`;
  }
  const days = Math.floor(diff / 86_400);
  const hours = Math.floor((diff % 86_400) / 3_600);
  if (days >= 2) {
    return `Quedan ${days} días para el cierre`;
  }
  if (days === 1) {
    return `Queda 1 día y ${hours} h para el cierre`;
  }
  return `Quedan ${Math.max(1, hours)} horas para el cierre`;
}

function describeVacaState(vaca: VacaStatusView): {
  badge: string;
  tone: "open" | "goal" | "expired" | "claimed";
  ruleSummary: string;
} {
  if (vaca.claimed) {
    return {
      badge: "Fondos entregados",
      tone: "claimed",
      ruleSummary:
        "La meta se cumplió y el contrato transfirió el saldo completo a la cuenta beneficiaria.",
    };
  }
  if (vaca.goalReached) {
    return {
      badge: "Meta alcanzada · Reclamo listo",
      tone: "goal",
      ruleSummary:
        "El 100% de la meta está cubierto en custodia. Cualquier firma puede ejecutar claim() hacia el beneficiario.",
    };
  }
  if (vaca.isOpen) {
    const remaining = Math.max(0, vaca.goalXlm - vaca.totalRaisedXlm);
    return {
      badge: "Abierta a aportes",
      tone: "open",
      ruleSummary: `Faltan ${remaining.toFixed(2)} XLM para liberar la meta al beneficiario. Si vence sin completarse, cada quien retira su aporte exacto.`,
    };
  }
  return {
    badge: "Vencida · Reembolso activo",
    tone: "expired",
    ruleSummary:
      "El plazo cerró antes de llegar a la meta. El beneficiario no puede retirar y cada aportante recupera su XLM con refund().",
  };
}

function validateCreateFields(values: CreateFormState) {
  const title = values.title.trim();
  const beneficiary = values.beneficiary.trim();
  const goalNum = Number(values.goalXlm);
  const daysNum = Number(values.days);

  return {
    title:
      title.length < 3
        ? "Escribí un nombre descriptivo de al menos 3 caracteres (ej. Paseo al volcán)."
        : title.length > 48
          ? "Usá máximo 48 caracteres para que el rótulo sea legible."
          : "",
    beneficiary: !isValidStellarAddress(beneficiary)
      ? "Ingresá una llave pública Stellar válida de 56 caracteres que inicie con G."
      : "",
    goalXlm:
      !Number.isFinite(goalNum) || goalNum <= 0
        ? "Indicá una meta en XLM mayor que 0 (ej. 25.00)."
        : goalNum > 1_000_000
          ? "Para pruebas en Testnet usá una meta menor a 1,000,000 XLM."
          : "",
    days:
      !Number.isFinite(daysNum) || daysNum < 1 || daysNum > 365
        ? "Elegí un plazo entre 1 y 365 días."
        : "",
  };
}

export function App() {
  const wallet = useStellarWallet();
  const [vacas, setVacas] = useState<VacaStatusView[]>([INITIAL_VACA]);
  const [selectedVacaId, setSelectedVacaId] = useState<number>(1);
  const [contributions, setContributions] = useState<Record<number, number>>({});
  const [amountInput, setAmountInput] = useState("1.0");
  const [amountTouched, setAmountTouched] = useState(false);
  const [isPreviewingRoute, setIsPreviewingRoute] = useState(false);
  const [cardAmounts, setCardAmounts] = useState<Record<number, string>>({});
  const [previewingCardId, setPreviewingCardId] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFunded, setIsFunded] = useState<boolean | null>(null);
  const [isFunding, setIsFunding] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [feedback, setFeedback] = useState<TxFeedback | null>(null);

  const [createForm, setCreateForm] = useState<CreateFormState>({
    title: "",
    beneficiary: "",
    goalXlm: "20",
    days: "14",
  });
  const [createTouched, setCreateTouched] = useState<CreateFormTouched>({
    title: false,
    beneficiary: false,
    goalXlm: false,
    days: false,
  });

  const amountFieldId = useId();
  const titleFieldId = useId();
  const beneficiaryFieldId = useId();
  const goalFieldId = useId();
  const daysFieldId = useId();

  const nowUnix = Math.floor(Date.now() / 1000);

  const loadVacas = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const list = await fetchAllVacas();
      if (list.length > 0) {
        setVacas(list);
      }
    } catch {
      // Keep last known on-chain snapshot visible when offline
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadVacas(false);
  }, [loadVacas]);

  useEffect(() => {
    const addr = wallet.address;
    if (!addr) {
      setContributions({});
      setIsFunded(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const funded = await checkAccountFunded(addr);
        if (!cancelled) setIsFunded(funded);
        if (funded && vacas.length > 0) {
          const map = await fetchUserContributions(
            addr,
            vacas.map((v) => v.id)
          );
          if (!cancelled) setContributions(map);
        }
      } catch {
        if (!cancelled) setIsFunded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet.address, vacas]);

  const activeVaca = useMemo(
    () =>
      vacas.find((v) => v.id === selectedVacaId) ??
      vacas.find((v) => v.id === 1) ??
      vacas[0] ??
      INITIAL_VACA,
    [vacas, selectedVacaId]
  );

  const pct = Math.min(
    100,
    Math.max(0, Math.round((activeVaca.totalRaisedXlm / activeVaca.goalXlm) * 100))
  );

  const parsedHeroAmount = Number(amountInput);
  const previewPct = useMemo(() => {
    if (!Number.isFinite(parsedHeroAmount) || parsedHeroAmount <= 0 || activeVaca.goalXlm <= 0) {
      return pct;
    }
    return Math.min(
      100,
      Math.max(
        pct,
        Math.round(((activeVaca.totalRaisedXlm + parsedHeroAmount) / activeVaca.goalXlm) * 100)
      )
    );
  }, [activeVaca.goalXlm, activeVaca.totalRaisedXlm, parsedHeroAmount, pct]);

  const heroAmountError =
    amountTouched && (!Number.isFinite(parsedHeroAmount) || parsedHeroAmount <= 0)
      ? "Ingresá un monto en XLM mayor que 0."
      : "";

  const createErrors = useMemo(() => validateCreateFields(createForm), [createForm]);

  const previewDeadlineUnix = useMemo(() => {
    const days = Math.max(1, Math.min(365, Math.floor(Number(createForm.days) || 14)));
    return nowUnix + days * 86_400;
  }, [createForm.days, nowUnix]);

  const handleCopyContract = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ID);
      setCopiedContract(true);
      window.setTimeout(() => setCopiedContract(false), 2200);
    } catch {
      setCopiedContract(false);
    }
  };

  const handleFriendbot = async () => {
    if (!wallet.address || isFunding) return;
    setIsFunding(true);
    setFeedback(null);
    try {
      await fundTestnetAccount(wallet.address);
      setIsFunded(true);
      setFeedback({
        kind: "success",
        message:
          "Friendbot acreditó 10,000 XLM de prueba en tu cuenta Testnet. Ya podés aportar o crear una vaca.",
      });
      await loadVacas(false);
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo fondear con Friendbot. Verificá tu conexión e intentá otra vez.",
      });
    } finally {
      setIsFunding(false);
    }
  };

  const executeContribution = async (vacaId: number, rawAmount: string) => {
    if (!wallet.address) {
      await wallet.connect();
      return;
    }
    const num = Number(rawAmount);
    if (!Number.isFinite(num) || num <= 0) {
      setFeedback({
        kind: "error",
        message: "Ingresá un monto válido en XLM mayor que 0 antes de firmar.",
      });
      return;
    }
    if (busyAction) return;
    setBusyAction(`contribute-${vacaId}`);
    setFeedback(null);
    try {
      const txHash = await contributeToVaca(
        vacaId,
        wallet.address,
        rawAmount,
        wallet.signTransaction
      );
      await loadVacas(false);
      setFeedback({
        kind: "success",
        message: `Aporte de ${num.toFixed(2)} XLM registrado en la Vaca #${vacaId}.`,
        txHash,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "La transacción de aporte no se completó. Revisá que tu wallet esté en Testnet con saldo XLM.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handlePrimaryContribute = async (e: FormEvent) => {
    e.preventDefault();
    setAmountTouched(true);
    await executeContribution(activeVaca.id, amountInput);
  };

  const handleClaim = async (vacaId: number) => {
    if (!wallet.address) {
      await wallet.connect();
      return;
    }
    if (busyAction) return;
    setBusyAction(`claim-${vacaId}`);
    setFeedback(null);
    try {
      const txHash = await claimVaca(vacaId, wallet.address, wallet.signTransaction);
      await loadVacas(false);
      setFeedback({
        kind: "success",
        message: `Fondos de la Vaca #${vacaId} liberados correctamente a la cuenta beneficiaria.`,
        txHash,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo ejecutar claim() en el contrato.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleRefund = async (vacaId: number) => {
    if (!wallet.address) {
      await wallet.connect();
      return;
    }
    if (busyAction) return;
    setBusyAction(`refund-${vacaId}`);
    setFeedback(null);
    try {
      const txHash = await refundVaca(
        vacaId,
        wallet.address,
        wallet.signTransaction
      );
      await loadVacas(false);
      setFeedback({
        kind: "success",
        message: `Reembolso ejecutado para tu cuenta en la Vaca #${vacaId}.`,
        txHash,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo ejecutar refund(). Verificá que el plazo haya vencido y tengas saldo aportado.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateBlur = (field: keyof CreateFormTouched) => (
    _e: FocusEvent<HTMLInputElement>
  ) => {
    setCreateTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCreateTouched({
      title: true,
      beneficiary: true,
      goalXlm: true,
      days: true,
    });

    if (
      createErrors.title ||
      createErrors.beneficiary ||
      createErrors.goalXlm ||
      createErrors.days
    ) {
      return;
    }

    if (!wallet.address) {
      await wallet.connect();
      return;
    }
    if (busyAction) return;

    setBusyAction("create-vaca");
    setFeedback(null);
    try {
      const { vacaId, hash } = await createNewVaca(
        {
          organizer: wallet.address,
          beneficiary: createForm.beneficiary.trim(),
          title: createForm.title.trim(),
          goalXlm: createForm.goalXlm,
          days: Number(createForm.days),
        },
        wallet.signTransaction
      );
      await loadVacas(false);
      setSelectedVacaId(vacaId);
      setCreateForm({
        title: "",
        beneficiary: wallet.address,
        goalXlm: "20",
        days: "14",
      });
      setCreateTouched({
        title: false,
        beneficiary: false,
        goalXlm: false,
        days: false,
      });
      setFeedback({
        kind: "success",
        message: `Vaca #${vacaId} creada en Soroban Testnet y cargada en el tablero.`,
        txHash: hash,
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo crear la vaca. Revisá que tu cuenta esté activa en Testnet.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="comp-frame" id="top">
        <div className="r-masthead-bar" aria-hidden="true" />
        <header className="masthead-layer">
          <a href="#top" className="r-brand-wordmark">
            VacaCR
          </a>

          <nav className="r-nav-links" aria-label="Navegación principal">
            <a href="#como-funciona">Cómo funciona</a>
            <a href="#colectas-activas">Colectas activas ({vacas.length})</a>
            <a href={STELLAR_LAB_URL} target="_blank" rel="noreferrer">
              Stellar Lab
            </a>
          </nav>

          <a
            href={EXPLORER_CONTRACT_URL}
            target="_blank"
            rel="noreferrer"
            className="r-contract-badge"
          >
            <Wallet className="contract-badge-icon" strokeWidth={2} aria-hidden="true" />
            <span>{shortenAddress(CONTRACT_ID, 6, 5)} · Testnet</span>
          </a>

          <button
            type="button"
            className="r-connect-wallet-btn"
            onClick={wallet.address ? wallet.disconnect : wallet.connect}
            disabled={wallet.isConnecting}
          >
            {wallet.address
              ? shortenAddress(wallet.address, 5, 4)
              : "Conectar Wallet"}
          </button>
        </header>

        <div className="r-hero-band" aria-hidden="true" />
        <div className="r-vaca-placard" aria-hidden="true" />

        <div className="hero-layer">
          <h1 className="r-vaca-title">{normalizeDisplayTitle(activeVaca)}</h1>
          <p className="r-vaca-subtitle">
            (Vaca #{activeVaca.id} · {activeVaca.isOpen ? "Abierta" : "Cerrada"})
          </p>

          <div className="r-salida-stat">
            <span className="endpoint-kicker">SALIDA</span>
            <span className="endpoint-num">0.00</span>
            <span className="endpoint-unit">XLM</span>
          </div>

          <div
            className={`r-route-progress-bar${
              isPreviewingRoute && previewPct > pct ? " is-previewing" : ""
            }`}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de la vaca"
          >
            <div className="route-rail">
              <div
                className="route-rail-preview"
                style={{
                  clipPath: `inset(0 ${100 - previewPct}% 0 0 round 999px)`,
                }}
                aria-hidden="true"
              />
              <div className="route-rail-fill" style={{ width: `${pct}%` }} />
              <div
                className="route-rail-ghost-pin"
                style={{ left: `${previewPct}%` }}
                aria-hidden="true"
              />
              <div className="route-rail-pin" style={{ left: `${pct}%` }} />
            </div>
          </div>

          <p className="r-raised-caption">
            {isPreviewingRoute && previewPct > pct
              ? `Con tu aporte: ${Math.min(
                  activeVaca.goalXlm,
                  activeVaca.totalRaisedXlm + parsedHeroAmount
                ).toFixed(2)} XLM (${previewPct}%)`
              : `${activeVaca.totalRaisedXlm.toFixed(2)} XLM recaudado (${pct}%)`}
          </p>

          <div className="r-meta-stat">
            <span className="endpoint-kicker">META</span>
            <span className="endpoint-num">{activeVaca.goalXlm.toFixed(2)}</span>
            <span className="endpoint-unit">XLM</span>
          </div>

          <div className="r-deadline-pill">
            Cierre: {formatShortDate(activeVaca.deadlineUnix)}
          </div>

          <span className="r-rules-label">Reglas</span>
          <div className="r-rules-pill">
            <span>100%</span>
            <ArrowRight className="rules-arrow" strokeWidth={2.8} aria-hidden="true" />
            <span>BENEFICIARIO · VENCIDO</span>
            <ArrowRight className="rules-arrow" strokeWidth={2.8} aria-hidden="true" />
            <span>REEMBOLSO</span>
          </div>

          <form
            className="hero-contribute-form"
            onSubmit={handlePrimaryContribute}
            noValidate
            onMouseEnter={() => setIsPreviewingRoute(true)}
            onMouseLeave={() => setIsPreviewingRoute(false)}
          >
            <label htmlFor={amountFieldId} className="r-amount-label">
              Monto en XLM
            </label>
            <div
              className={`r-amount-input${heroAmountError ? " field-invalid" : ""}`}
            >
              <input
                id={amountFieldId}
                type="text"
                inputMode="decimal"
                value={amountInput}
                aria-invalid={heroAmountError ? "true" : "false"}
                onFocus={() => setIsPreviewingRoute(true)}
                onBlur={() => {
                  setAmountTouched(true);
                  setIsPreviewingRoute(false);
                }}
                onChange={(e) => setAmountInput(e.target.value)}
              />
              <span className="input-unit">XLM</span>
            </div>

            <button
              type="submit"
              className="r-contribute-btn"
              disabled={busyAction === `contribute-${activeVaca.id}`}
            >
              {busyAction === `contribute-${activeVaca.id}`
                ? "Firmando…"
                : "Aportar XLM"}
            </button>
          </form>

          <div className="r-steps-strip" aria-hidden="true" />
          <p className="r-steps-summary">
            <strong>1.</strong>&nbsp;Creá la vaca&nbsp;&nbsp;·&nbsp;&nbsp;
            <strong>2.</strong>&nbsp;Aportá al contrato&nbsp;&nbsp;·&nbsp;&nbsp;
            <strong>3.</strong>&nbsp;Meta o reembolso
          </p>

          <a href="#crear-vaca" className="r-create-vaca-btn">
            <Plus size={19} strokeWidth={2.1} aria-hidden="true" />
            <span>Crear nueva vaca</span>
          </a>

          <div className="r-section-divider" aria-hidden="true" />
          <h2 id="como-funciona" className="r-below-fold-heading">
            Cómo funciona el contrato
          </h2>
          <h2 id="contrato-testnet" className="r-below-fold-kicker">
            Contrato en Testnet
          </h2>
        </div>
      </div>

      <main className="page-body">
        <section
          className="section-block section-narrative"
          aria-labelledby="como-funciona"
        >
          <div className="narrative-grid">
            <div className="comparison-ledger">
              <p className="narrative-lead">
                En Costa Rica armamos vacas para la cancha del sábado, regalos de
                oficina o viajes entre compas. Cuando la plata cae por transferencia
                personal, se mezcla con el gasto diario y devolver aportes si el
                plan se cancela depende de perseguir mensajes. En{" "}
                <strong>VacaCR</strong>, el dinero queda bajo llave en un contrato
                Soroban con reglas verificables antes de poner el primer XLM.
              </p>

              <div className="comparison-table" role="table" aria-label="Comparación entre colecta informal y custodia en Soroban">
                <div className="comparison-row comparison-row--head" role="row">
                  <div className="comparison-cell" role="columnheader">
                    Situación habitual
                  </div>
                  <div className="comparison-cell" role="columnheader">
                    Vaca informal en cuenta personal
                  </div>
                  <div className="comparison-cell comparison-cell--soroban" role="columnheader">
                    Custodia VacaCR en Soroban
                  </div>
                </div>

                <div className="comparison-row" role="row">
                  <div className="comparison-cell comparison-topic" role="cell">
                    Dónde reposa la plata
                  </div>
                  <div
                    className="comparison-cell"
                    role="cell"
                    data-col="Cuenta personal"
                  >
                    En la cuenta privada de quien organiza, sin separación del saldo propio.
                  </div>
                  <div
                    className="comparison-cell comparison-cell--soroban"
                    role="cell"
                    data-col="Custodia Soroban"
                  >
                    En el contrato <code>VacaCrContract</code> sobre XLM nativo (SAC) en Testnet.
                  </div>
                </div>

                <div className="comparison-row" role="row">
                  <div className="comparison-cell comparison-topic" role="cell">
                    Quién lleva la cuenta
                  </div>
                  <div
                    className="comparison-cell"
                    role="cell"
                    data-col="Cuenta personal"
                  >
                    Capturas de pantalla en el chat grupal y sumas manuales.
                  </div>
                  <div
                    className="comparison-cell comparison-cell--soroban"
                    role="cell"
                    data-col="Custodia Soroban"
                  >
                    Lectura pública en vivo con <code>get_status</code> y <code>get_contribution</code> sin conectar wallet.
                  </div>
                </div>

                <div className="comparison-row" role="row">
                  <div className="comparison-cell comparison-topic" role="cell">
                    Cuándo sale el dinero
                  </div>
                  <div
                    className="comparison-cell"
                    role="cell"
                    data-col="Cuenta personal"
                  >
                    En cualquier momento, incluso antes de reunir el monto acordado.
                  </div>
                  <div
                    className="comparison-cell comparison-cell--soroban"
                    role="cell"
                    data-col="Custodia Soroban"
                  >
                    <code>claim()</code> transfiere al beneficiario únicamente cuando el total llega al 100% de la meta.
                  </div>
                </div>

                <div className="comparison-row" role="row">
                  <div className="comparison-cell comparison-topic" role="cell">
                    Si el plan se cae
                  </div>
                  <div
                    className="comparison-cell"
                    role="cell"
                    data-col="Cuenta personal"
                  >
                    Devoluciones manuales una por una cuando el organizador tenga tiempo.
                  </div>
                  <div
                    className="comparison-cell comparison-cell--soroban"
                    role="cell"
                    data-col="Custodia Soroban"
                  >
                    Al vencer el plazo sin meta cumplida, cada aportante ejecuta <code>refund()</code> por su monto exacto.
                  </div>
                </div>
              </div>
            </div>

            <div className="manifest-column">
              <h2 className="manifest-mobile-heading">Contrato en Testnet</h2>
              <aside
                className="contract-manifest"
                aria-labelledby="contrato-testnet"
              >
                <p className="manifest-copy">
                  Cualquier persona puede auditar el almacenamiento del contrato, sus
                  transacciones firmadas y el token XLM nativo directamente en la red
                  de pruebas de{"\u00A0"}Stellar.
                </p>

              <dl className="manifest-list">
                <div className="manifest-item">
                  <dt>ID del contrato Soroban</dt>
                  <dd className="manifest-code-row">
                    <code>{shortenAddress(CONTRACT_ID, 10, 10)}</code>
                    <button
                      type="button"
                      className="btn-inline-copy"
                      onClick={handleCopyContract}
                    >
                      <Copy size={14} strokeWidth={2} aria-hidden="true" />
                      <span>{copiedContract ? "Copiado" : "Copiar ID"}</span>
                    </button>
                  </dd>
                </div>

                <div className="manifest-item">
                  <dt>Activo en custodia (Native XLM SAC)</dt>
                  <dd>
                    <code>{shortenAddress(NATIVE_XLM_SAC, 10, 10)}</code>
                  </dd>
                </div>

                <div className="manifest-item">
                  <dt>Nodo Soroban RPC</dt>
                  <dd>
                    <code>soroban-testnet.stellar.org</code>
                  </dd>
                </div>
              </dl>

              <div className="manifest-actions">
                <a
                  href={STELLAR_LAB_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-enamel-cobalt"
                >
                  <span>Inspeccionar en Stellar Lab</span>
                  <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
                </a>
                <a
                  href={EXPLORER_CONTRACT_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-enamel-outline"
                >
                  <span>Historial en Stellar Expert</span>
                  <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
                </a>
              </div>
              </aside>
            </div>
          </div>
        </section>

        <section
          id="colectas-activas"
          className="section-block section-workspace"
          aria-labelledby="heading-colectas"
        >
          <div className="workspace-header">
            <div>
              <h2 id="heading-colectas" className="section-heading">
                Tablero de colectas en Testnet ({vacas.length})
              </h2>
              <p className="section-subcopy">
                Consultá el estado real en cadena sin conectar billetera, o seguí las
                tres paradas para fondear tu cuenta de prueba y firmar en Soroban.
              </p>
            </div>

            <button
              type="button"
              className="btn-enamel-outline"
              onClick={() => void loadVacas(true)}
              disabled={isRefreshing}
            >
              <RefreshCw
                size={16}
                strokeWidth={2}
                className={isRefreshing ? "icon-spin" : undefined}
                aria-hidden="true"
              />
              <span>{isRefreshing ? "Consultando RPC…" : "Actualizar estado"}</span>
            </button>
          </div>

          {(wallet.error || feedback || heroAmountError) && (
            <div
              className={`live-banner live-banner--${
                wallet.error || heroAmountError || feedback?.kind === "error"
                  ? "error"
                  : "success"
              }`}
              role={
                wallet.error || heroAmountError || feedback?.kind === "error"
                  ? "alert"
                  : "status"
              }
              aria-live={
                wallet.error || heroAmountError || feedback?.kind === "error"
                  ? "assertive"
                  : "polite"
              }
            >
              <div className="live-banner__body">
                <strong>
                  {wallet.error || heroAmountError || feedback?.kind === "error"
                    ? "Revisá este paso:"
                    : "Transacción confirmada:"}
                </strong>{" "}
                <span>
                  {wallet.error || heroAmountError || feedback?.message}
                </span>
                {feedback?.txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${feedback.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="live-banner__link"
                  >
                    Ver firma en Stellar Expert
                    <ArrowUpRight size={15} strokeWidth={2} aria-hidden="true" />
                  </a>
                )}
              </div>
              <button
                type="button"
                className="btn-enamel-ghost"
                onClick={() => {
                  wallet.clearError();
                  setFeedback(null);
                  setAmountTouched(false);
                }}
              >
                Cerrar aviso
              </button>
            </div>
          )}

          <div className="onboarding-route" aria-label="Pasos para operar en Stellar Testnet">
            <div
              className={`route-stop${wallet.address ? " route-stop--done" : " route-stop--current"}`}
            >
              <div className="route-stop__header">
                <span className="route-stop__badge">Parada 1</span>
                <strong>Conectá tu wallet en Testnet</strong>
              </div>
              <p className="route-stop__detail">
                {wallet.address
                  ? `${wallet.walletName ?? "Wallet"} activa: ${shortenAddress(wallet.address, 6, 6)}`
                  : "Compatible con Freighter, xBull, Albedo y Rabet en red Testnet."}
              </p>
              <div className="route-stop__action">
                <button
                  type="button"
                  className={
                    wallet.address ? "btn-enamel-outline" : "btn-enamel-cobalt"
                  }
                  onClick={wallet.address ? wallet.disconnect : wallet.connect}
                  disabled={wallet.isConnecting}
                >
                  <Wallet size={15} strokeWidth={2} aria-hidden="true" />
                  <span>
                    {wallet.address ? "Desconectar wallet" : "Conectar Wallet"}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={`route-stop${
                wallet.address && isFunded
                  ? " route-stop--done"
                  : wallet.address
                    ? " route-stop--current"
                    : ""
              }`}
            >
              <div className="route-stop__header">
                <span className="route-stop__badge">Parada 2</span>
                <strong>Activá saldo gratis con Friendbot</strong>
              </div>
              <p className="route-stop__detail">
                {!wallet.address
                  ? "Conectá primero tu billetera para verificar si ya tiene XLM de prueba."
                  : isFunded === false
                    ? "Tu llave aún no existe en Testnet. Fondeala con 10,000 XLM gratuitos."
                    : "Cuenta verificada en Horizon Testnet. Podés pedir recarga si necesitás más XLM."}
              </p>
              <div className="route-stop__action">
                <button
                  type="button"
                  className="btn-enamel-outline"
                  onClick={() => void handleFriendbot()}
                  disabled={!wallet.address || isFunding}
                >
                  <Sparkles size={15} strokeWidth={2} aria-hidden="true" />
                  <span>
                    {isFunding ? "Solicitando a Friendbot…" : "Pedir 10,000 XLM"}
                  </span>
                </button>
              </div>
            </div>

            <div
              className={`route-stop${
                wallet.address && isFunded ? " route-stop--current" : ""
              }`}
            >
              <div className="route-stop__header">
                <span className="route-stop__badge">Parada 3</span>
                <strong>Aportá, reclamá o abrí nueva vaca</strong>
              </div>
              <p className="route-stop__detail">
                Elegí cualquier colecta abajo para aportar XLM, reclamar una meta
                cumplida o pedir reembolso si venció el{"\u00A0"}plazo.
              </p>
              <div className="route-stop__action">
                <a href="#crear-vaca" className="btn-enamel-outline">
                  <Plus size={15} strokeWidth={2} aria-hidden="true" />
                  <span>Ir a crear vaca</span>
                </a>
              </div>
            </div>
          </div>

          <div className="vaca-roster">
            {vacas.map((vaca) => {
              const vacaPct = Math.min(
                100,
                Math.max(0, Math.round((vaca.totalRaisedXlm / vaca.goalXlm) * 100))
              );
              const statusInfo = describeVacaState(vaca);
              const myStake = contributions[vaca.id] ?? 0;
              const isSelected = vaca.id === activeVaca.id;
              const localAmount = cardAmounts[vaca.id] ?? "2.0";
              const parsedCardAmt = Number(localAmount);
              const cardPreviewPct =
                Number.isFinite(parsedCardAmt) && parsedCardAmt > 0 && vaca.goalXlm > 0
                  ? Math.min(
                      100,
                      Math.max(
                        vacaPct,
                        Math.round(((vaca.totalRaisedXlm + parsedCardAmt) / vaca.goalXlm) * 100)
                      )
                    )
                  : vacaPct;
              const isCardPreviewing =
                previewingCardId === vaca.id && cardPreviewPct > vacaPct;
              const isContributingThis = busyAction === `contribute-${vaca.id}`;
              const isClaimingThis = busyAction === `claim-${vaca.id}`;
              const isRefundingThis = busyAction === `refund-${vaca.id}`;

              return (
                <article
                  key={vaca.id}
                  className={`vaca-ticket${isSelected ? " vaca-ticket--featured" : ""}`}
                >
                  <div className="vaca-ticket__top">
                    <div className="vaca-ticket__title-group">
                      <span className="vaca-ticket__number">Vaca #{vaca.id}</span>
                      <h3 className="vaca-ticket__title">
                        {normalizeDisplayTitle(vaca)}
                      </h3>
                    </div>

                    <div className="vaca-ticket__badges">
                      <span
                        className={`status-stamp status-stamp--${statusInfo.tone}`}
                      >
                        {statusInfo.badge}
                      </span>
                      {!isSelected ? (
                        <button
                          type="button"
                          className="btn-enamel-ghost"
                          onClick={() => {
                            setSelectedVacaId(vaca.id);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Subir al rótulo principal
                        </button>
                      ) : (
                        <span className="featured-tag">En rótulo principal</span>
                      )}
                    </div>
                  </div>

                  <div className="vaca-ticket__route">
                    <div className="vaca-ticket__figures">
                      <span>
                        Recaudado:{" "}
                        <strong>{vaca.totalRaisedXlm.toFixed(2)} XLM</strong> (
                        {vacaPct}%)
                      </span>
                      <span>
                        Meta: <strong>{vaca.goalXlm.toFixed(2)} XLM</strong>
                      </span>
                    </div>

                    <div
                      className={`ticket-rail${isCardPreviewing ? " is-previewing" : ""}`}
                      role="progressbar"
                      aria-valuenow={vacaPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Avance de ${vaca.title}`}
                    >
                      <div
                        className="ticket-rail__preview"
                        style={{
                          clipPath: `inset(0 ${100 - cardPreviewPct}% 0 0 round 999px)`,
                        }}
                        aria-hidden="true"
                      />
                      <div
                        className="ticket-rail__fill"
                        style={{ width: `${vacaPct}%` }}
                      />
                      <div
                        className="ticket-rail__pin"
                        style={{ left: `${vacaPct}%` }}
                      />
                    </div>
                  </div>

                  <dl className="vaca-ticket__meta">
                    <div className="ticket-meta-box">
                      <dt>
                        <Clock size={14} strokeWidth={2} aria-hidden="true" />
                        <span>Cuenta regresiva y cierre</span>
                      </dt>
                      <dd>
                        <strong>{formatShortDate(vaca.deadlineUnix)}</strong>
                        <span>{describeCountdown(vaca.deadlineUnix, nowUnix)}</span>
                      </dd>
                    </div>

                    <div className="ticket-meta-box">
                      <dt>
                        <Wallet size={14} strokeWidth={2} aria-hidden="true" />
                        <span>Beneficiario en contrato</span>
                      </dt>
                      <dd>
                        <code>{shortenAddress(vaca.beneficiary, 7, 6)}</code>
                        <span>
                          {wallet.address === vaca.beneficiary
                            ? "Sos la cuenta beneficiaria"
                            : `Organizó ${shortenAddress(vaca.organizer, 5, 4)}`}
                        </span>
                      </dd>
                    </div>

                    <div className="ticket-meta-box">
                      <dt>
                        <Coins size={14} strokeWidth={2} aria-hidden="true" />
                        <span>Tu aporte registrado</span>
                      </dt>
                      <dd>
                        <strong>
                          {wallet.address
                            ? `${myStake.toFixed(2)} XLM`
                            : "Sin wallet conectada"}
                        </strong>
                        <span>
                          {wallet.address
                            ? myStake > 0
                              ? "Respaldado por refund() si vence sin meta"
                              : "Aún no registrás aportes en esta vaca"
                            : "Conectá tu wallet para consultar tu saldo aquí"}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <div className="vaca-ticket__footer">
                    <p className="vaca-ticket__rule-note">{statusInfo.ruleSummary}</p>

                    <div className="vaca-ticket__controls">
                      {vaca.isOpen && !vaca.claimed && (
                        <div
                          className="inline-contribute-group"
                          onMouseEnter={() => setPreviewingCardId(vaca.id)}
                          onMouseLeave={() =>
                            setPreviewingCardId((cur) =>
                              cur === vaca.id ? null : cur
                            )
                          }
                        >
                          <div className="quick-chips" role="group" aria-label="Montos rápidos en XLM">
                            {["1.0", "2.5", "5.0"].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                className={`chip-amount${
                                  localAmount === preset ? " chip-amount--active" : ""
                                }`}
                                onClick={() =>
                                  setCardAmounts((prev) => ({
                                    ...prev,
                                    [vaca.id]: preset,
                                  }))
                                }
                              >
                                +{preset}
                              </button>
                            ))}
                          </div>

                          <label
                            className="sr-only"
                            htmlFor={`card-amount-${vaca.id}`}
                          >
                            Monto en XLM para {vaca.title}
                          </label>
                          <div className="ticket-amount-field">
                            <input
                              id={`card-amount-${vaca.id}`}
                              type="text"
                              inputMode="decimal"
                              value={localAmount}
                              onFocus={() => setPreviewingCardId(vaca.id)}
                              onBlur={() =>
                                setPreviewingCardId((cur) =>
                                  cur === vaca.id ? null : cur
                                )
                              }
                              onChange={(e) =>
                                setCardAmounts((prev) => ({
                                  ...prev,
                                  [vaca.id]: e.target.value,
                                }))
                              }
                            />
                            <span>XLM</span>
                          </div>

                          <button
                            type="button"
                            className="btn-enamel-vermilion"
                            disabled={isContributingThis}
                            onClick={() =>
                              void executeContribution(vaca.id, localAmount)
                            }
                          >
                            {isContributingThis ? "Firmando…" : "Aportar XLM"}
                          </button>
                        </div>
                      )}

                      {vaca.goalReached && !vaca.claimed && (
                        <button
                          type="button"
                          className="btn-enamel-cobalt"
                          disabled={isClaimingThis}
                          onClick={() => void handleClaim(vaca.id)}
                        >
                          <CheckCircle2
                            size={16}
                            strokeWidth={2}
                            aria-hidden="true"
                          />
                          <span>
                            {isClaimingThis
                              ? "Liberando fondos…"
                              : "Reclamar meta para beneficiario"}
                          </span>
                        </button>
                      )}

                      {!vaca.isOpen && !vaca.goalReached && !vaca.claimed && (
                        <button
                          type="button"
                          className="btn-enamel-outline"
                          disabled={
                            isRefundingThis || (Boolean(wallet.address) && myStake <= 0)
                          }
                          onClick={() => void handleRefund(vaca.id)}
                        >
                          <RotateCcw size={16} strokeWidth={2} aria-hidden="true" />
                          <span>
                            {isRefundingThis
                              ? "Procesando reembolso…"
                              : myStake > 0
                                ? `Reembolsar mis ${myStake.toFixed(2)} XLM`
                                : "Solicitar reembolso"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section
          id="crear-vaca"
          className="section-block section-commission"
          aria-labelledby="heading-crear-vaca"
        >
          <div className="commission-band">
            <div className="commission-sheet">
              <div className="commission-intro">
                <h2 id="heading-crear-vaca" className="section-heading">
                  Abrir una nueva vaca en Soroban
                </h2>
                <p className="section-subcopy">
                  Al firmar <code>create_vaca</code>, el nombre, la cuenta
                  beneficiaria, la meta en XLM y la fecha límite quedan grabados en
                  Stellar Testnet sin posibilidad de cambiar las reglas a mitad del
                  camino.
                </p>

                <dl className="commission-preview">
                  <div>
                    <dt>Cierre calculado</dt>
                    <dd>{formatShortDate(previewDeadlineUnix)}</dd>
                  </div>
                  <div>
                    <dt>Token de custodia</dt>
                    <dd>XLM nativo (SAC Testnet)</dd>
                  </div>
                  <div>
                    <dt>Condición de salida</dt>
                    <dd>100% al beneficiario o reembolso individual</dd>
                  </div>
                </dl>
              </div>

              <form
                className="commission-form"
                onSubmit={handleCreateSubmit}
                noValidate
              >
                <div className="form-field">
                  <label htmlFor={titleFieldId}>Nombre de la colecta</label>
                  <p id={`${titleFieldId}-hint`} className="field-hint">
                    Aparecerá en el rótulo público de la vaca (entre 3 y 48 caracteres).
                  </p>
                  <input
                    id={titleFieldId}
                    type="text"
                    placeholder="Ej. Alquiler cancha sintética"
                    value={createForm.title}
                    aria-describedby={
                      createTouched.title && createErrors.title
                        ? `${titleFieldId}-hint ${titleFieldId}-err`
                        : `${titleFieldId}-hint`
                    }
                    aria-invalid={
                      createTouched.title && createErrors.title ? "true" : "false"
                    }
                    className={
                      createTouched.title && createErrors.title
                        ? "user-invalid-fallback"
                        : undefined
                    }
                    onBlur={handleCreateBlur("title")}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                  {createTouched.title && createErrors.title && (
                    <p
                      id={`${titleFieldId}-err`}
                      className="field-error"
                      role="alert"
                    >
                      {createErrors.title}
                    </p>
                  )}
                </div>

                <div className="form-field">
                  <div className="field-label-row">
                    <label htmlFor={beneficiaryFieldId}>
                      Cuenta beneficiaria (G…)
                    </label>
                    {wallet.address && (
                      <button
                        type="button"
                        className="btn-inline-copy"
                        onClick={() => {
                          setCreateForm((prev) => ({
                            ...prev,
                            beneficiary: wallet.address ?? "",
                          }));
                          setCreateTouched((prev) => ({
                            ...prev,
                            beneficiary: true,
                          }));
                        }}
                      >
                        Usar mi wallet conectada
                      </button>
                    )}
                  </div>
                  <p id={`${beneficiaryFieldId}-hint`} className="field-hint">
                    Recibirá el 100% únicamente cuando la vaca alcance la meta.
                  </p>
                  <input
                    id={beneficiaryFieldId}
                    type="text"
                    placeholder="GCJLYYUL76PUNEYTUMAQHDUHZQEVGUDODZVDE2H6ZFN3KWH4OCUQ5UKS"
                    value={createForm.beneficiary}
                    aria-describedby={
                      createTouched.beneficiary && createErrors.beneficiary
                        ? `${beneficiaryFieldId}-hint ${beneficiaryFieldId}-err`
                        : `${beneficiaryFieldId}-hint`
                    }
                    aria-invalid={
                      createTouched.beneficiary && createErrors.beneficiary
                        ? "true"
                        : "false"
                    }
                    className={
                      createTouched.beneficiary && createErrors.beneficiary
                        ? "user-invalid-fallback"
                        : undefined
                    }
                    onBlur={handleCreateBlur("beneficiary")}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        beneficiary: e.target.value,
                      }))
                    }
                  />
                  {createTouched.beneficiary && createErrors.beneficiary && (
                    <p
                      id={`${beneficiaryFieldId}-err`}
                      className="field-error"
                      role="alert"
                    >
                      {createErrors.beneficiary}
                    </p>
                  )}
                </div>

                <div className="form-row-two">
                  <div className="form-field">
                    <label htmlFor={goalFieldId}>Meta total (XLM)</label>
                    <p id={`${goalFieldId}-hint`} className="field-hint">
                      Monto exacto para desbloquear el retiro.
                    </p>
                    <input
                      id={goalFieldId}
                      type="text"
                      inputMode="decimal"
                      value={createForm.goalXlm}
                      aria-describedby={
                        createTouched.goalXlm && createErrors.goalXlm
                          ? `${goalFieldId}-hint ${goalFieldId}-err`
                          : `${goalFieldId}-hint`
                      }
                      aria-invalid={
                        createTouched.goalXlm && createErrors.goalXlm
                          ? "true"
                          : "false"
                      }
                      className={
                        createTouched.goalXlm && createErrors.goalXlm
                          ? "user-invalid-fallback"
                          : undefined
                      }
                      onBlur={handleCreateBlur("goalXlm")}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          goalXlm: e.target.value,
                        }))
                      }
                    />
                    {createTouched.goalXlm && createErrors.goalXlm && (
                      <p
                        id={`${goalFieldId}-err`}
                        className="field-error"
                        role="alert"
                      >
                        {createErrors.goalXlm}
                      </p>
                    )}
                  </div>

                  <div className="form-field">
                    <label htmlFor={daysFieldId}>Plazo hasta el cierre (días)</label>
                    <p id={`${daysFieldId}-hint`} className="field-hint">
                      Entre 1 y 365 días desde la firma.
                    </p>
                    <input
                      id={daysFieldId}
                      type="number"
                      min={1}
                      max={365}
                      value={createForm.days}
                      aria-describedby={
                        createTouched.days && createErrors.days
                          ? `${daysFieldId}-hint ${daysFieldId}-err`
                          : `${daysFieldId}-hint`
                      }
                      aria-invalid={
                        createTouched.days && createErrors.days ? "true" : "false"
                      }
                      className={
                        createTouched.days && createErrors.days
                          ? "user-invalid-fallback"
                          : undefined
                      }
                      onBlur={handleCreateBlur("days")}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          days: e.target.value,
                        }))
                      }
                    />
                    {createTouched.days && createErrors.days && (
                      <p
                        id={`${daysFieldId}-err`}
                        className="field-error"
                        role="alert"
                      >
                        {createErrors.days}
                      </p>
                    )}
                  </div>
                </div>

                <div className="commission-submit-row">
                  <button
                    type="submit"
                    className="btn-enamel-cobalt btn-enamel-cobalt--lg"
                    disabled={busyAction === "create-vaca"}
                  >
                    <Plus size={18} strokeWidth={2.2} aria-hidden="true" />
                    <span>
                      {busyAction === "create-vaca"
                        ? "Publicando vaca en Soroban…"
                        : wallet.address
                          ? "Firmar y abrir nueva vaca"
                          : "Conectar wallet para crear vaca"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <strong>VacaCR</strong>
            <span>
              Colectas grupales con custodia programable sobre Stellar Soroban
              Testnet · Pura Vida Bootcamp.
            </span>
          </div>

          <nav className="site-footer__links" aria-label="Enlaces de verificación">
            <a href={STELLAR_LAB_URL} target="_blank" rel="noreferrer">
              Contrato en Stellar Lab
            </a>
            <a href={EXPLORER_CONTRACT_URL} target="_blank" rel="noreferrer">
              Explorador Stellar Expert
            </a>
            <a
              href="https://github.com/frarojas/vaca-cr-soroban"
              target="_blank"
              rel="noreferrer"
            >
              Código fuente en GitHub
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
