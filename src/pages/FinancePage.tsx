import { StellarSpark } from "../components/CosmicEnvironment";
import { PageLoading } from "../components/PageLoading";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import {
  CalendarRange,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { SurfaceCard } from "../components/SurfaceCard";
import { useNexus } from "../context/NexusContext";
import { dateKey, civilDate, shiftDate, APP_TIMEZONE } from "../lib/dates";
import { isDemoMode } from "../lib/supabase";
import { supabase } from "../lib/supabase";

type FinanceSnapshot = {
  id: string;
  snapshot_date: string;
  monthly_allowance: number | string;
  saved_money: number | string;
  spending_plan: number | string;
  note: string | null;
  source: string;
};
type FinanceEntry = {
  id: string;
  title: string;
  kind: "income" | "expense";
  category: string;
  amount: number | string;
  entry_date: string;
  status: "planned" | "realized";
  note: string | null;
};

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const number = (value: number | string | undefined) => Number(value ?? 0);
const today = dateKey;
const categories = [
  "Pessoal",
  "Alimentação",
  "Transporte",
  "Educação",
  "Lazer",
  "Patrimônio",
  "Outros",
];

export function FinancePage() {
  const { userId } = useNexus();
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const writeLock = useRef(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("Pessoal");
  const [status, setStatus] = useState<"planned" | "realized">("realized");
  const [entryDate, setEntryDate] = useState(today());

  const load = useCallback(async () => {
    if (!userId) {
      setSnapshot(null);
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [snap, ledger] = await Promise.all([
        supabase
          .from("financial_snapshots")
          .select("*")
          .eq("user_id", userId)
          .order("snapshot_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("personal_finance_entries")
          .select("*")
          .eq("user_id", userId)
          .order("entry_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(120),
      ]);
      if (snap.error) throw snap.error;
      if (ledger.error) throw ledger.error;
      setSnapshot((snap.data as FinanceSnapshot | null) ?? null);
      setEntries((ledger.data ?? []) as FinanceEntry[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as finanças.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    void load();
  }, [load]);

  const allowance = number(snapshot?.monthly_allowance);
  const saved = number(snapshot?.saved_money);
  const spending = number(snapshot?.spending_plan);
  const planPct = allowance > 0 ? Math.round((spending / allowance) * 100) : 0;
  const protectedAmount = Math.max(0, allowance - spending);
  const updated = useMemo(
    () =>
      snapshot?.snapshot_date
        ? civilDate(snapshot.snapshot_date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: APP_TIMEZONE,
          })
        : null,
    [snapshot],
  );
  const monthKey = today().slice(0, 7);
  const current = entries.filter((item) =>
    item.entry_date.startsWith(monthKey),
  );
  const realizedExpense = current
    .filter((item) => item.kind === "expense" && item.status === "realized")
    .reduce((sum, item) => sum + number(item.amount), 0);
  const realizedIncome = current
    .filter((item) => item.kind === "income" && item.status === "realized")
    .reduce((sum, item) => sum + number(item.amount), 0);
  const remainingPlan = spending - realizedExpense;
  const futurePlanned = (days: number) => {
    const start = dateKey();
    const limit = dateKey(shiftDate(civilDate(start), days));
    return entries
      .filter(
        (item) =>
          item.status === "planned" &&
          item.entry_date >= start &&
          item.entry_date <= limit,
      )
      .reduce(
        (sum, item) =>
          sum +
          (item.kind === "income" ? number(item.amount) : -number(item.amount)),
        0,
      );
  };

  async function addEntry() {
    if (
      writeLock.current ||
      !title.trim() ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0 ||
      !entryDate
    )
      return;
    if (!userId) {
      setActionError(
        "Entre na sua conta para registrar movimentações. A demonstração não altera finanças.",
      );
      return;
    }
    writeLock.current = true;
    setAdding(true);
    setActionError(null);
    try {
      const { error } = await supabase.from("personal_finance_entries").insert({
        user_id: userId,
        title: title.trim(),
        kind,
        category,
        amount: Number(amount),
        entry_date: entryDate,
        status,
      });
      if (error) throw error;
      setTitle("");
      setAmount("");
      setStatus("realized");
      await load();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o lançamento.",
      );
    } finally {
      writeLock.current = false;
      setAdding(false);
    }
  }
  async function removeEntry(id: string) {
    if (writeLock.current || !userId) return;
    writeLock.current = true;
    setRemoving(id);
    setActionError(null);
    try {
      const { error } = await supabase
        .from("personal_finance_entries")
        .delete()
        .eq("user_id", userId)
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir o lançamento.",
      );
    } finally {
      writeLock.current = false;
      setRemoving(null);
    }
  }
  if (loading) return <PageLoading />;
  if (error) return <WorkspaceFeedback error={error} retry={load} />;

  return (
    <div className="page-stack finance-page">
      <section className="orbital-heading page-hero--amber finance-hero">
        <div>
          <span className="eyebrow">Resumo atual</span>
          <h1>
            <StellarSpark />
            Finanças
          </h1>
          <p>
            Mesada, reserva e plano de gastos continuam no centro. Abaixo, você
            pode registrar o que realmente entrou ou saiu sem transformar isso
            numa planilha enorme.
          </p>
        </div>
        <div className="finance-hero__status">
          <ShieldCheck size={17} />
          <div>
            <span>Atualizado em</span>
            <strong>
              {updated ?? (loading ? "Carregando…" : "Sem registro")}
            </strong>
            <small>dados privados</small>
          </div>
        </div>
      </section>

      {actionError && (
        <p role="alert" className="orbital-action-error">
          {actionError}
        </p>
      )}
      {!snapshot && (
        <p className="panel-copy" role="status">
          Ainda não há resumo financeiro cadastrado. Os valores abaixo são dos
          registros carregados; a projeção depende de um resumo mensal.
        </p>
      )}
      {!userId && (
        <p className="panel-copy">
          {isDemoMode
            ? "Modo de demonstração: lançamentos exigem uma conta autenticada."
            : "Seu perfil precisa estar disponível para registrar movimentações."}
        </p>
      )}
      <section className="finance-metrics">
        <SurfaceCard tone="blue" className="finance-metric">
          <span className="finance-metric__icon">
            <WalletCards size={18} />
          </span>
          <div>
            <span>Mesada</span>
            <strong>{snapshot ? brl.format(allowance) : "—"}</strong>
            <small>valor mensal cadastrado</small>
          </div>
        </SurfaceCard>
        <SurfaceCard
          tone="green"
          className="finance-metric finance-metric--primary"
        >
          <span className="finance-metric__icon">
            <PiggyBank size={18} />
          </span>
          <div>
            <span>Dinheiro guardado</span>
            <strong>{snapshot ? brl.format(saved) : "—"}</strong>
            <small>reserva registrada</small>
          </div>
        </SurfaceCard>
        <SurfaceCard tone="amber" className="finance-metric">
          <span className="finance-metric__icon">
            <CircleDollarSign size={18} />
          </span>
          <div>
            <span>Plano de gastos</span>
            <strong>{snapshot ? brl.format(spending) : "—"}</strong>
            <small>{planPct}% da mesada</small>
          </div>
        </SurfaceCard>
      </section>

      <section className="finance-layout">
        <SurfaceCard tone="amber" eyebrow="Mesada" title="Plano mensal">
          <div className="finance-plan">
            <div className="finance-plan__header">
              <div>
                <span>Planejado para gastos</span>
                <strong>{snapshot ? brl.format(spending) : "—"}</strong>
              </div>
              <div>
                <span>Não destinado ao plano</span>
                <strong>{snapshot ? brl.format(protectedAmount) : "—"}</strong>
              </div>
            </div>
            <div className="finance-plan__bar">
              <span style={{ width: `${Math.min(100, planPct)}%` }} />
            </div>
            <p>
              Esse restante não é tratado automaticamente como dinheiro livre
              para gastar.
            </p>
          </div>
        </SurfaceCard>
        <SurfaceCard tone="green" eyebrow="Reserva" title="Dinheiro guardado">
          <div className="finance-reserve">
            <Landmark size={25} />
            <strong>{snapshot ? brl.format(saved) : "—"}</strong>
            <span>registrados como reserva</span>
          </div>
        </SurfaceCard>
      </section>

      <section className="finance-ledger-summary">
        <SurfaceCard tone="rose">
          <span>Saídas realizadas</span>
          <strong>{brl.format(realizedExpense)}</strong>
          <small>neste mês</small>
        </SurfaceCard>
        <SurfaceCard tone="green">
          <span>Entradas registradas</span>
          <strong>{brl.format(realizedIncome)}</strong>
          <small>além do resumo fixo</small>
        </SurfaceCard>
        <SurfaceCard tone={remainingPlan < 0 ? "rose" : "blue"}>
          <span>Plano ainda disponível</span>
          <strong>{snapshot ? brl.format(remainingPlan) : "—"}</strong>
          <small>
            {remainingPlan < 0 ? "acima do planejado" : "do plano de gastos"}
          </small>
        </SurfaceCard>
      </section>

      <SurfaceCard
        tone="blue"
        eyebrow="Registro rápido"
        title="Entrada ou saída"
      >
        <fieldset
          className="finance-entry-form"
          disabled={adding || removing !== null}
        >
          <label>
            <span>Descrição</span>
            <input
              aria-label="Descrição do lançamento"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: lanche, livro, cinema…"
            />
          </label>
          <div className="finance-entry-form__row">
            <label>
              <span>Tipo</span>
              <select
                aria-label="Tipo de lançamento"
                value={kind}
                onChange={(e) =>
                  setKind(e.target.value as "income" | "expense")
                }
              >
                <option value="expense">Saída</option>
                <option value="income">Entrada</option>
              </select>
            </label>
            <label>
              <span>Valor em reais</span>
              <input
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                aria-label="Valor em reais"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="R$ 0"
              />
            </label>
            <label>
              <span>Categoria</span>
              <select
                aria-label="Categoria"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Data</span>
              <input
                type="date"
                aria-label="Data do lançamento"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </label>
          </div>
          <div className="finance-entry-form__footer">
            <div className="view-switcher">
              <button
                aria-pressed={status === "realized"}
                className={status === "realized" ? "active" : ""}
                onClick={() => setStatus("realized")}
              >
                Já aconteceu
              </button>
              <button
                aria-pressed={status === "planned"}
                className={status === "planned" ? "active" : ""}
                onClick={() => setStatus("planned")}
              >
                Planejado
              </button>
            </div>
            <button
              className="primary-button"
              disabled={
                !userId ||
                adding ||
                !title.trim() ||
                !Number.isFinite(Number(amount)) ||
                Number(amount) <= 0 ||
                !entryDate
              }
              onClick={() => void addEntry()}
            >
              <Plus size={15} />
              {adding ? "Registrando…" : "Registrar"}
            </button>
          </div>
        </fieldset>
      </SurfaceCard>

      <section className="finance-horizon-grid">
        {[30, 60, 90].map((days) => (
          <SurfaceCard key={days} eyebrow={`${days} dias`} title="Horizonte">
            <div className="finance-horizon">
              <CalendarRange size={18} />
              <div>
                <strong>
                  {snapshot
                    ? brl.format(
                        protectedAmount * Math.ceil(days / 30) +
                          futurePlanned(days),
                      )
                    : "—"}
                </strong>
                <span>
                  potencial não comprometido se a mesada e o plano atual se
                  repetirem
                </span>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </section>

      <SurfaceCard
        tone="slate"
        eyebrow="Movimentações"
        title={entries.length ? "Últimos registros" : "Nenhum registro ainda"}
      >
        <p className="panel-copy">
          Consulta limitada aos 120 últimos lançamentos; 10 exibidos abaixo.
          Totais e projeções consideram apenas esses dados carregados.
        </p>
        <div className="finance-entry-list">
          {entries.slice(0, 10).map((item) => (
            <article key={item.id}>
              <span className={`finance-entry-kind ${item.kind}`}>
                {item.kind === "expense" ? "−" : "+"}
              </span>
              <div>
                <strong>{item.title}</strong>
                <small>
                  {item.category} ·{" "}
                  {civilDate(item.entry_date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    timeZone: APP_TIMEZONE,
                  })}{" "}
                  · {item.status === "planned" ? "planejado" : "realizado"}
                </small>
              </div>
              <strong className={item.kind}>
                {item.kind === "expense" ? "-" : "+"}
                {brl.format(number(item.amount))}
              </strong>
              <button
                className="icon-button"
                disabled={adding || removing !== null}
                onClick={() => void removeEntry(item.id)}
                aria-label={`Excluir ${item.title}`}
              >
                <Trash2 size={14} />
              </button>
            </article>
          ))}
          {!entries.length && (
            <div className="empty-compact">
              <ReceiptText size={17} />
              Quando você registrar uma movimentação, ela aparece aqui.
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
