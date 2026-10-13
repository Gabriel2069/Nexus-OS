import { StellarSpark } from "../components/CosmicEnvironment";
import {
  ArrowRight,
  Beaker,
  BookOpen,
  CalendarClock,
  Clock3,
  Crosshair,
  GraduationCap,
  Plus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageLoading } from "../components/PageLoading";
import { WorkspaceFeedback } from "../components/WorkspaceFeedback";
import { civilDate, dateKey } from "../lib/dates";
import { SurfaceCard } from "../components/SurfaceCard";
import { useNexus } from "../context/NexusContext";
import { navigate } from "../lib/router";
import { getRoutineContext } from "../lib/routine-context";
import { emitUI } from "../lib/ui-events";
import type { AcademicEvent } from "../types/nexus";

const days = [
  { id: 1, short: "SEG", label: "Segunda" },
  { id: 2, short: "TER", label: "Terça" },
  { id: 3, short: "QUA", label: "Quarta" },
  { id: 4, short: "QUI", label: "Quinta" },
  { id: 5, short: "SEX", label: "Sexta" },
  { id: 6, short: "SÁB", label: "Sábado" },
  { id: 0, short: "DOM", label: "Domingo" },
];

function displayTime(value: string) {
  return value.slice(0, 5);
}
function eventDate(event: AcademicEvent) {
  const date = event.starts_at
    ? new Date(event.starts_at)
    : event.event_date
      ? civilDate(event.event_date)
      : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}
function eventWhen(event: AcademicEvent) {
  const date = eventDate(event);
  if (!date) return "Data não definida";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    ...(event.starts_at ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "America/Sao_Paulo",
  })
    .format(date)
    .replace(".", "");
}
function eventIso(event: AcademicEvent) {
  const date = eventDate(event);
  return date ? dateKey(date) : "";
}
function daysUntil(event: AcademicEvent) {
  const date = eventDate(event);
  if (!date) return null;
  return Math.max(
    0,
    Math.round(
      (civilDate(dateKey(date)).getTime() - civilDate(dateKey()).getTime()) /
        86_400_000,
    ),
  );
}

export function StudiesPage() {
  const { workspace, loading, error, refresh } = useNexus();
  const currentWeekday = civilDate(dateKey()).getUTCDay();
  const [selectedDay, setSelectedDay] = useState(() => currentWeekday);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const schedule = workspace.academicSchedule;
  const events = workspace.academicEvents;
  const context = getRoutineContext(workspace);
  const selectedSchedule = useMemo(
    () =>
      schedule
        .filter((item) => item.weekday === selectedDay)
        .sort(
          (a, b) =>
            a.start_time.localeCompare(b.start_time) ||
            a.sort_order - b.sort_order,
        ),
    [schedule, selectedDay],
  );
  const classes = selectedSchedule.filter(
    (item) => item.schedule_type === "class",
  );
  const extras = selectedSchedule.filter(
    (item) => item.schedule_type !== "class",
  );
  const upcoming = useMemo(
    () =>
      events
        .filter((event) => {
          const date = eventDate(event);
          return date
            ? dateKey(date) >= dateKey() &&
                !["Concluído", "Cancelado", "Cancelada"].includes(event.status)
            : false;
        })
        .sort(
          (a, b) =>
            (eventDate(a)?.getTime() ?? Infinity) -
            (eventDate(b)?.getTime() ?? Infinity),
        )
        .slice(0, 12),
    [events],
  );
  const nextEvent = upcoming[0];
  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? null;
  const completedEvents = events.filter(
    (event) => event.status === "Concluído",
  ).length;
  const relevantMissions = selectedEvent
    ? workspace.missions
        .filter((mission) => {
          if (["Inbox", "Feita", "Cancelada"].includes(mission.status))
            return false;
          const words = selectedEvent.title
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .filter((word) => word.length > 3);
          return words.some((word) =>
            `${mission.title} ${mission.notes ?? ""}`
              .toLowerCase()
              .includes(word),
          );
        })
        .slice(0, 5)
    : [];
  const studyNow =
    context.suggestion.kind === "focus" ? context.suggestion : null;

  function inspectEvent(event: AcademicEvent) {
    setSelectedEventId(event.id);
    if (window.matchMedia("(max-width:920px)").matches) {
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(".academic-event-inspector")
          ?.focus(),
      );
    }
  }

  if (loading) return <PageLoading />;
  if (error) return <WorkspaceFeedback error={error} retry={refresh} />;

  return (
    <div className="page-stack studies-page studies-page--consultable">
      <section className="orbital-heading academic-hero">
        <div>
          <span className="eyebrow">Escola e estudos</span>
          <h1>
            Estudos
            <StellarSpark />
          </h1>
          <p>
            Consulte o dia, abra provas e simulados, veja o que já está ligado a
            eles e crie preparação sem sair da tela.
          </p>
        </div>
        <div className="academic-hero__summary">
          <GraduationCap size={18} />
          <div>
            <span>{studyNow ? "Janela de estudo agora" : "No horizonte"}</span>
            <strong>
              {studyNow?.title ?? nextEvent?.title ?? "Nenhum próximo evento"}
            </strong>
            <small>
              {studyNow
                ? `${studyNow.durationMinutes ?? 45} min sugeridos`
                : nextEvent
                  ? eventWhen(nextEvent)
                  : "nenhum evento cadastrado"}
            </small>
          </div>
        </div>
      </section>

      {studyNow && (
        <SurfaceCard tone="violet" className="academic-now">
          <Crosshair size={18} />
          <div>
            <span className="eyebrow">Cabe agora</span>
            <strong>{studyNow.title}</strong>
            <p>{studyNow.detail}</p>
          </div>
          <button
            className="primary-button"
            onClick={() => navigate(studyNow.actionPath ?? "/foco")}
          >
            Começar
          </button>
        </SurfaceCard>
      )}

      <section className="academic-metrics">
        <SurfaceCard tone="blue">
          <span>Aulas na semana</span>
          <strong>
            {schedule.filter((item) => item.schedule_type === "class").length}
          </strong>
          <small>horários cadastrados</small>
        </SurfaceCard>
        <SurfaceCard tone="violet">
          <span>Plantões e blocos</span>
          <strong>
            {schedule.filter((item) => item.schedule_type !== "class").length}
          </strong>
          <small>fora da grade regular</small>
        </SurfaceCard>
        <SurfaceCard tone="green">
          <span>Eventos concluídos</span>
          <strong>{completedEvents}</strong>
          <small>no histórico cadastrado</small>
        </SurfaceCard>
        <SurfaceCard tone="amber">
          <span>Próximo evento</span>
          <strong>{nextEvent ? daysUntil(nextEvent) : "—"}</strong>
          <small>{nextEvent ? "dias restantes" : "sem evento próximo"}</small>
        </SurfaceCard>
      </section>

      <section className="academic-layout">
        <SurfaceCard
          className="academic-timetable"
          tone="blue"
          eyebrow="Horários"
          title="Grade da semana"
        >
          <div
            className="academic-day-tabs"
            role="tablist"
            aria-label="Dia da semana"
          >
            {days.map((day) => (
              <button
                key={day.id}
                role="tab"
                aria-label={day.label}
                id={`academic-tab-${day.id}`}
                aria-controls="academic-day-panel"
                aria-selected={selectedDay === day.id}
                tabIndex={selectedDay === day.id ? 0 : -1}
                className={selectedDay === day.id ? "active" : ""}
                onClick={() => setSelectedDay(day.id)}
                onKeyDown={(e) => {
                  const index = days.findIndex((d) => d.id === day.id);
                  const next =
                    e.key === "ArrowRight"
                      ? (index + 1) % days.length
                      : e.key === "ArrowLeft"
                        ? (index + days.length - 1) % days.length
                        : e.key === "Home"
                          ? 0
                          : e.key === "End"
                            ? days.length - 1
                            : null;
                  if (next === null) return;
                  e.preventDefault();
                  setSelectedDay(days[next].id);
                  document
                    .getElementById(`academic-tab-${days[next].id}`)
                    ?.focus();
                }}
              >
                <span>{day.short}</span>
                <small>{day.label}</small>
              </button>
            ))}
          </div>
          <div
            role="tabpanel"
            id="academic-day-panel"
            aria-labelledby={`academic-tab-${selectedDay}`}
            tabIndex={0}
          >
            <div className="academic-day-heading">
              <div>
                <span className="eyebrow">
                  {days.find((day) => day.id === selectedDay)?.label}
                </span>
                <h3>{classes.length} aulas</h3>
              </div>
              {selectedDay === currentWeekday && (
                <span className="academic-today-chip">Hoje</span>
              )}
            </div>
            <div className="academic-class-list">
              {classes.map((item, index) => (
                <article className="academic-class-row" key={item.id}>
                  <div className="academic-time">
                    <strong>{displayTime(item.start_time)}</strong>
                    <small>
                      {item.end_time ? displayTime(item.end_time) : ""}
                    </small>
                  </div>
                  <span className="academic-line">
                    <i />
                    {index < classes.length - 1 && <b />}
                  </span>
                  <div className="academic-class-copy">
                    <strong>{item.subject}</strong>
                    <small>Aula regular</small>
                  </div>
                </article>
              ))}
              {!classes.length && (
                <div className="empty-compact">
                  <BookOpen size={16} />
                  Sem aulas regulares neste dia.
                </div>
              )}
            </div>
            {extras.length > 0 && (
              <div className="academic-extras">
                <span className="eyebrow">Blocos do dia</span>
                {extras.map((item) => (
                  <article key={item.id}>
                    <span
                      className={`academic-extra-icon academic-extra-icon--${item.schedule_type}`}
                    >
                      <Beaker size={14} />
                    </span>
                    <div>
                      <strong>{item.subject}</strong>
                      <small>
                        <Clock3 size={11} />
                        {displayTime(item.start_time)}
                        {item.end_time ? `–${displayTime(item.end_time)}` : ""}
                        {item.note ? ` · ${item.note}` : ""}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </SurfaceCard>

        <aside className="academic-side">
          <SurfaceCard
            tone="violet"
            eyebrow="Rotina semanal"
            title="Blocos de estudo"
          >
            <div className="academic-rules">
              {schedule
                .filter((item) => item.schedule_type !== "class")
                .sort(
                  (a, b) =>
                    ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) ||
                    a.start_time.localeCompare(b.start_time),
                )
                .map((item) => (
                  <div key={item.id}>
                    <span>
                      {days.find((day) => day.id === item.weekday)?.label} ·{" "}
                      {displayTime(item.start_time)}
                    </span>
                    <strong>{item.subject}</strong>
                    {item.note && <small>{item.note}</small>}
                  </div>
                ))}
              {!schedule.some((item) => item.schedule_type !== "class") && (
                <p className="panel-copy">
                  Nenhum bloco de estudo cadastrado. Você pode começar com uma
                  missão de preparação.
                </p>
              )}
            </div>
            <button
              className="text-button"
              onClick={() => navigate("/calendario")}
            >
              Consultar calendário <ArrowRight size={14} />
            </button>
          </SurfaceCard>
        </aside>
      </section>

      <section
        className={`academic-events-workspace ${selectedEvent ? "has-inspector" : ""}`}
      >
        <SurfaceCard
          tone="cyan"
          eyebrow="Calendário"
          title="Próximos eventos"
          action={
            <span className="surface-chip">
              <CalendarClock size={12} />
              <span>{upcoming.length}</span>
            </span>
          }
        >
          <div className="academic-event-list">
            {upcoming.map((event, index) => (
              <button
                className={`academic-event academic-event--button ${index === 0 ? "academic-event--next" : ""} ${selectedEventId === event.id ? "selected" : ""}`}
                id={`academic-event-${event.id}`}
                key={event.id}
                aria-pressed={selectedEventId === event.id}
                onClick={() => inspectEvent(event)}
              >
                <div className="academic-event__date">
                  <strong>
                    {eventDate(event)?.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    })}
                  </strong>
                  <span>
                    {eventDate(event)
                      ?.toLocaleDateString("pt-BR", {
                        month: "short",
                        timeZone: "America/Sao_Paulo",
                      })
                      .replace(".", "")}
                  </span>
                </div>
                <div className="academic-event__body">
                  <div>
                    <span
                      className={`academic-status academic-status--${event.status.toLowerCase()}`}
                    >
                      {event.status}
                    </span>
                    {event.format && (
                      <span className="academic-format">{event.format}</span>
                    )}
                  </div>
                  <strong>{event.title}</strong>
                  <small>
                    {eventWhen(event)}
                    {event.note ? ` · ${event.note}` : ""}
                  </small>
                </div>
                <ArrowRight size={15} />
              </button>
            ))}
            {!upcoming.length && (
              <div className="empty-compact">
                Nenhum compromisso acadêmico futuro cadastrado.
              </div>
            )}
          </div>
        </SurfaceCard>

        {selectedEvent && (
          <aside
            className="academic-event-inspector"
            tabIndex={-1}
            aria-label="Detalhes do evento"
          >
            <SurfaceCard tone="amber" className="entity-inspector">
              <div className="entity-inspector__header">
                <div>
                  <span className="eyebrow">Evento acadêmico</span>
                  <h2>{selectedEvent.title}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="Fechar evento"
                  onClick={() => {
                    setSelectedEventId(null);
                    requestAnimationFrame(() =>
                      document
                        .getElementById(`academic-event-${selectedEventId}`)
                        ?.focus(),
                    );
                  }}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="entity-inspector__meta">
                <span>{eventWhen(selectedEvent)}</span>
                {daysUntil(selectedEvent) !== null && (
                  <span>{daysUntil(selectedEvent)} dias</span>
                )}
                {selectedEvent.format && <span>{selectedEvent.format}</span>}
              </div>
              {selectedEvent.note && (
                <p className="panel-copy">{selectedEvent.note}</p>
              )}
              <div className="entity-inspector__actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    emitUI("quickAdd", {
                      type: "mission",
                      dueDate: eventIso(selectedEvent),
                      title: `Preparar ${selectedEvent.title}`,
                    })
                  }
                >
                  <Plus size={15} />
                  Criar preparação
                </button>
                <button
                  className="secondary-button"
                  onClick={() =>
                    navigate(`/calendario?date=${eventIso(selectedEvent)}`)
                  }
                >
                  <CalendarClock size={15} />
                  Ver dia
                </button>
              </div>
            </SurfaceCard>
            <SurfaceCard
              tone="violet"
              eyebrow="Possíveis relações"
              title="Missões para preparar"
            >
              <p className="panel-copy">
                Sugestões pelo título do evento; confira a relação antes de
                começar.
              </p>
              <div className="project-linked-missions">
                {relevantMissions.map((mission) => (
                  <button
                    key={mission.id}
                    onClick={() =>
                      navigate(
                        `/foco?minutes=${mission.duration_minutes ?? 45}&mission=${mission.id}`,
                      )
                    }
                  >
                    <span
                      className={`rank-chip rank-${mission.rank.toLowerCase()}`}
                    >
                      {mission.rank}
                    </span>
                    <div>
                      <strong>{mission.title}</strong>
                      <small>
                        {mission.status} · {mission.duration_minutes ?? 45} min
                      </small>
                    </div>
                    <Crosshair size={14} />
                  </button>
                ))}
                {!relevantMissions.length && (
                  <div className="empty-compact">
                    Nenhuma missão identificada pelo título. Crie uma preparação
                    apenas se ela realmente precisar existir.
                  </div>
                )}
              </div>
            </SurfaceCard>
          </aside>
        )}
      </section>
    </div>
  );
}
