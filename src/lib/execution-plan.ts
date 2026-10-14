import { civilDate, dateKey, shiftDate } from "./dates";
import { getReadiness, rankMissions } from "./decision-engine";
import { normalizeSearch } from "./navigation-state";
import { occurrencesForDay } from "./routine-context";
import type {
  NexusMission,
  NexusProject,
  NexusWorkspace,
} from "../types/nexus";

export function executable(m: NexusMission) {
  return ["A fazer", "Em andamento"].includes(m.status);
}
export function missionMinutes(m: NexusMission) {
  return m.duration_minutes && m.duration_minutes > 0 ? m.duration_minutes : 45;
}
export function projectSummary(
  project: NexusProject,
  w: NexusWorkspace,
  now = new Date(),
) {
  const missions = w.missions.filter((m) => m.project_id === project.id);
  const open = missions.filter(
    (m) => !["Feita", "Cancelada"].includes(m.status),
  );
  const checkin = w.checkin?.checkin_date === dateKey(now) ? w.checkin : null;
  return {
    missions,
    open,
    done: missions.filter((m) => m.status === "Feita").length,
    blocked: open.filter((m) => m.status === "Bloqueada").length,
    next: ["Ativo", "Ideia"].includes(project.status)
      ? (rankMissions(open, checkin, now)[0]?.mission ?? null)
      : null,
    focusMinutes: w.focusSessions
      .filter(
        (s) =>
          s.status === "completed" &&
          s.mission_id &&
          missions.some((m) => m.id === s.mission_id),
      )
      .reduce((sum, s) => sum + Math.max(0, s.actual_minutes ?? 0), 0),
  };
}
export function filterMissions(
  missions: NexusMission[],
  options: {
    query?: string;
    project?: string;
    status?: string;
    deadline?: string;
    minutes?: number;
  },
  now = new Date(),
) {
  const terms = normalizeSearch(options.query ?? "")
      .split(/\s+/)
      .filter(Boolean),
    today = dateKey(now);
  return missions.filter((m) => {
    const due =
      m.due_at && Number.isFinite(Date.parse(m.due_at))
        ? dateKey(new Date(m.due_at))
        : null;
    return (
      terms.every((term) =>
        normalizeSearch(`${m.title} ${m.notes ?? ""}`).includes(term),
      ) &&
      (!options.project ||
        (options.project === "none"
          ? !m.project_id
          : m.project_id === options.project)) &&
      (!options.status || m.status === options.status) &&
      (!options.minutes || missionMinutes(m) <= options.minutes) &&
      (!options.deadline ||
        (options.deadline === "today" && due === today) ||
        (options.deadline === "overdue" &&
          !!due &&
          due < today &&
          executable(m)) ||
        (options.deadline === "none" && !due))
    );
  });
}
export function buildExecutionPlan(
  w: NexusWorkspace,
  requestedMinutes = 45,
  projectId?: string,
  now = new Date(),
) {
  const requested = Number.isFinite(requestedMinutes)
    ? Math.max(15, Math.min(240, Math.floor(requestedMinutes)))
    : 45;
  const key = dateKey(now),
    day = civilDate(key);
  const blockers = occurrencesForDay(w.calendarCommitments, day)
    .filter(
      (e) =>
        !e.isOptional &&
        e.end > now &&
        e.end.getTime() > e.start.getTime() &&
        e.end.getTime() - e.start.getTime() < 20 * 3600000,
    )
    .map((e) => ({
      title: e.title,
      start: e.start,
      end: e.end,
      source: "Calendário",
    }));
  for (const s of w.academicSchedule) {
    if (
      s.weekday !== day.getUTCDay() ||
      !s.end_time ||
      !/^\d\d:\d\d(?::\d\d)?$/.test(s.start_time) ||
      !/^\d\d:\d\d(?::\d\d)?$/.test(s.end_time)
    )
      continue;
    const start = new Date(`${key}T${s.start_time.slice(0, 5)}:00-03:00`),
      end = new Date(`${key}T${s.end_time.slice(0, 5)}:00-03:00`);
    if (Number.isFinite(start.getTime()) && end > start && end > now)
      blockers.push({ title: s.subject, start, end, source: "Estudos" });
  }
  blockers.sort((a, b) => a.start.getTime() - b.start.getTime());
  const blocker = blockers.find((e) => e.end > now) ?? null;
  const midnight = new Date(`${dateKey(shiftDate(day, 1))}T00:00:00-03:00`);
  const available = Math.max(
    0,
    Math.min(
      requested,
      Math.floor(
        ((blocker?.start.getTime() ?? midnight.getTime()) - now.getTime()) /
          60000,
      ),
      Math.floor((midnight.getTime() - now.getTime()) / 60000),
    ),
  );
  const currentCheckin = w.checkin?.checkin_date === key ? w.checkin : null;
  const projects = new Map(w.projects.map((p) => [p.id, p]));
  const candidates = w.missions.filter(
    (m) =>
      executable(m) &&
      (!projectId || m.project_id === projectId) &&
      (!m.project_id ||
        ["Ativo", "Ideia"].includes(projects.get(m.project_id)?.status ?? "")),
  );
  const ranked = rankMissions(candidates, currentCheckin, now);
  let used = 0;
  const steps = ranked
    .flatMap(({ mission }) => {
      const minutes = missionMinutes(mission);
      if (used + minutes > available) return [];
      const start = new Date(now.getTime() + used * 60000);
      used += minutes;
      return [
        {
          mission,
          minutes,
          estimated: !mission.duration_minutes,
          project: mission.project_id
            ? projects.get(mission.project_id)
            : undefined,
          start,
          end: new Date(now.getTime() + used * 60000),
          reason:
            mission.due_at &&
            Number.isFinite(Date.parse(mission.due_at)) &&
            dateKey(new Date(mission.due_at)) <= key
              ? "Prazo merece atenção"
              : mission.status === "Em andamento"
                ? "Retomar o que já começou"
                : `Prioridade ${mission.priority.toLowerCase()}`,
        },
      ];
    })
    .slice(0, 5);
  // The cap is part of the plan: do not charge time for entries not displayed.
  const plannedMinutes = steps.reduce((sum, s) => sum + s.minutes, 0);
  return {
    requested,
    available,
    plannedMinutes,
    remaining: available - plannedMinutes,
    steps,
    blocker,
    readiness: getReadiness(currentCheckin),
    candidateCount: candidates.length,
    inbox: w.missions.filter((m) => m.status === "Inbox").length,
    blocked: w.missions.filter(
      (m) =>
        m.status === "Bloqueada" && (!projectId || m.project_id === projectId),
    ).length,
    undirected: w.projects.filter(
      (p) => p.status === "Ativo" && !p.next_action?.trim(),
    ).length,
    generatedAt: now,
  };
}
