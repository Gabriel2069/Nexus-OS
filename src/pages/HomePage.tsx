import { StellarSpark } from "../components/CosmicEnvironment";
import { CosmicTexture } from "../components/CosmicEnvironment";
import {
  ArrowRight,
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  Coins,
  GraduationCap,
  Moon,
  Orbit,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SurfaceCard } from "../components/SurfaceCard";
import { PageLoading } from "../components/PageLoading";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import { OrbitalSignal } from "../components/CosmicEnvironment";
import { useNexus } from "../context/NexusContext";
import { dateKey } from "../lib/dates";
import { navigate } from "../lib/router";
import {
  formatOccurrenceTime,
  getRoutineContext,
} from "../lib/routine-context";
const dayLabel = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
const timeLabel = (date: Date) =>
  new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
const categoryLabel: Record<string, string> = {
  school: "Escola",
  class: "Aula",
  study: "Estudo",
  exam: "Prova",
  health: "Saúde",
  recovery: "Pausa",
  sleep: "Sono",
};
export function HomePage() {
  const { workspace, loading, error, refresh } = useNexus();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const context = useMemo(
    () => getRoutineContext(workspace, now),
    [workspace, now],
  );
  const todayKey = dateKey(now);
  const todayFocus = workspace.focusSessions
    .filter(
      (session) =>
        session.status === "completed" &&
        dateKey(new Date(session.started_at)) === todayKey,
    )
    .reduce((sum, session) => sum + (session.actual_minutes ?? 0), 0);
  const checkinDone = workspace.checkin?.checkin_date === todayKey;
  const routineItems = workspace.routines.flatMap(
    (routine) => routine.routine_items ?? [],
  );
  const completedIds = new Set(
    workspace.routineCompletions
      .filter((item) => item.completion_date === dateKey())
      .map((item) => item.routine_item_id),
  );
  const eveningDone = routineItems
    .filter((item) => /fechar|vitória|amanhã/i.test(item.title))
    .some((item) => completedIds.has(item.id));
  const focusPath = context.suggestion.actionPath?.startsWith("/foco")
    ? context.suggestion.actionPath
    : "/foco";
  const timedToday = context.today.filter(
    (event) =>
      !event.isOptional &&
      !["sleep", "recovery"].includes(event.category) &&
      event.end.getTime() - event.start.getTime() < 20 * 60 * 60_000,
  );
  if (loading) return <PageLoading />;
  if (error)
    return (
      <div className="page-stack now-page">
        <WorkspaceFeedback error={error} retry={refresh} />
      </div>
    );
  return (
    <div className="page-stack now-page">
      <header className="now-heading">
        <div>
          <span className="eyebrow">Seu observatório pessoal</span>
          <h1>
            Agora
            <StellarSpark />
          </h1>
        </div>
        <div className="now-heading__time">
          <time dateTime={now.toISOString()}>{timeLabel(now)}</time>
          <span>{dayLabel(now)}</span>
        </div>
      </header>
      <section
        className={`now-stage now-stage--${context.suggestion.kind}`}
        aria-labelledby="now-next-title"
      >
        <CosmicTexture />
        <div className="now-stage__main">
          <div className="now-stage__copy">
            <span className="eyebrow">
              {context.current
                ? "Em andamento"
                : context.suggestion.optional
                  ? "Espaço para você"
                  : "Seu próximo passo"}
            </span>
            <h2 id="now-next-title">{context.suggestion.title}</h2>
            <p>{context.suggestion.detail}</p>
            <div className="now-stage__meta">
              {!context.current && context.freeMinutes > 0 && (
                <span>
                  <Clock3 size={14} />
                  {context.freeMinutes} min até o próximo limite
                </span>
              )}
              {context.current && (
                <span>
                  <Clock3 size={14} />
                  {formatOccurrenceTime(context.current)}
                </span>
              )}
              {context.next && (
                <span>
                  <CalendarClock size={14} />
                  {context.next.title} · {timeLabel(context.next.start)}
                </span>
              )}
            </div>
            {context.suggestion.actionPath ? (
              <button
                className="primary-button now-stage__action"
                onClick={() => navigate(context.suggestion.actionPath!)}
              >
                {context.suggestion.actionLabel ?? "Abrir"}
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="secondary-button now-stage__action"
                onClick={() =>
                  navigate(context.current ? "/calendario" : "/hoje")
                }
              >
                {context.current ? "Ver compromisso" : "Ver meu dia"}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
          <OrbitalSignal />
        </div>
        <footer className="now-stage__footer">
          <span>
            <Orbit size={14} />
            {context.load === "cheio"
              ? "Um dia cheio, com pausas"
              : context.load === "leve"
                ? "Há espaço entre os compromissos"
                : "Um passo de cada vez"}
          </span>
          <span>
            {workspace.journey
              ? `${workspace.journey.xp_earned} XP registrados hoje`
              : "No seu ritmo"}
          </span>
        </footer>
      </section>
      <section className="now-support-grid">
        <SurfaceCard
          tone="blue"
          className="now-agenda"
          eyebrow="Trajetória do dia"
          title="O que está no caminho"
          action={
            <button
              className="text-button"
              onClick={() => navigate("/calendario")}
              aria-label="Abrir Calendário"
            >
              <CalendarDays size={17} />
            </button>
          }
        >
          <div className="day-route">
            {timedToday.map((event) => {
              const current = event.start <= now && event.end > now,
                past = event.end <= now;
              return (
                <div
                  className={`day-route__item ${current ? "is-current" : ""} ${past ? "is-past" : ""}`}
                  key={event.id}
                >
                  <div className="day-route__time">
                    <strong>{timeLabel(event.start)}</strong>
                    <small>{timeLabel(event.end)}</small>
                  </div>
                  <span className="day-route__dot" aria-hidden="true" />
                  <div className="day-route__copy">
                    <span>
                      {categoryLabel[event.category] ?? event.category}
                      {current ? " · agora" : past ? " · encerrado" : ""}
                    </span>
                    <strong>{event.title}</strong>
                  </div>
                </div>
              );
            })}
            {!timedToday.length && (
              <div className="now-empty">
                <Orbit size={26} aria-hidden="true" />
                <strong>Seu dia tem espaço.</strong>
                <p>Nenhum compromisso fixo registrado para hoje.</p>
                <button
                  className="secondary-button"
                  onClick={() => navigate("/calendario")}
                >
                  Abrir agenda
                </button>
              </div>
            )}
          </div>
        </SurfaceCard>
        <div className="now-side-stack">
          <SurfaceCard
            tone="violet"
            eyebrow="Continuidade"
            title="O essencial, sem pressa"
          >
            <div className="essential-loop">
              <button
                className={checkinDone ? "done" : ""}
                onClick={() => navigate("/hoje")}
              >
                <span>
                  {checkinDone ? <Check size={16} /> : <Sparkles size={16} />}
                </span>
                <div>
                  <strong>Como você está?</strong>
                  <small>
                    {checkinDone
                      ? "check-in registrado hoje"
                      : "energia e humor, em um instante"}
                  </small>
                </div>
                <ArrowRight size={14} />
              </button>
              <button
                className={todayFocus > 0 ? "done" : ""}
                onClick={() => navigate(focusPath)}
              >
                <span>
                  {todayFocus > 0 ? <Check size={16} /> : <Orbit size={16} />}
                </span>
                <div>
                  <strong>Um bloco que importa</strong>
                  <small>
                    {todayFocus > 0
                      ? `${todayFocus} min registrados hoje`
                      : "quando houver espaço de verdade"}
                  </small>
                </div>
                <ArrowRight size={14} />
              </button>
              <button
                className={eveningDone ? "done" : ""}
                onClick={() => navigate("/rotinas")}
              >
                <span>
                  {eveningDone ? <Check size={16} /> : <Moon size={16} />}
                </span>
                <div>
                  <strong>Fechar o dia</strong>
                  <small>guardar o que ficou e desacelerar</small>
                </div>
                <ArrowRight size={14} />
              </button>
            </div>
          </SurfaceCard>
        </div>
      </section>
      <section className="now-bottom-grid">
        <SurfaceCard
          eyebrow="Depois"
          title={context.later?.title ?? "O próximo passo pode esperar"}
        >
          <p className="panel-copy">
            {context.later?.detail ??
              "Volte quando este momento terminar. O NexOS organiza o que vem depois."}
          </p>
        </SurfaceCard>
        <SurfaceCard
          tone="amber"
          eyebrow="No horizonte"
          title={context.nextExam?.title ?? "Sem prova à vista"}
        >
          <div className="exam-glance">
            <GraduationCap size={22} />
            <div>
              {context.nextExam ? (
                <>
                  <strong>
                    {context.daysToExam === 0
                      ? "Hoje"
                      : context.daysToExam === 1
                        ? "Amanhã"
                        : `em ${context.daysToExam} dias`}
                  </strong>
                  <span>{dayLabel(context.nextExam.start)}</span>
                </>
              ) : (
                <>
                  <strong>A agenda está tranquila.</strong>
                  <span>Nenhuma prova futura registrada.</span>
                </>
              )}
            </div>
          </div>
        </SurfaceCard>
        <SurfaceCard
          tone="violet"
          eyebrow="Sua constelação"
          title={
            workspace.profile
              ? `Nível ${workspace.profile.level}`
              : "Seu percurso"
          }
        >
          <div className="now-progress">
            <Trophy size={21} />
            {workspace.profile ? (
              <div>
                <strong>
                  {workspace.profile.xp_total.toLocaleString("pt-BR")} XP
                </strong>
                <span>
                  <Coins size={13} />
                  {workspace.profile.nexus_coins} coins
                </span>
              </div>
            ) : (
              <p className="panel-copy">
                A progressão aparece quando seu perfil estiver disponível.
              </p>
            )}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
