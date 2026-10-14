import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      try {
        return next(specifier + ".ts", context);
      } catch {}
    }
    return next(specifier, context);
  },
});
const { buildExecutionPlan, filterMissions, projectSummary } = await import(
  "../src/lib/execution-plan.ts"
);
const { parseLocalIntent, localViewReadout, projectReadout } = await import(
  "../src/lib/nex-local.ts"
);
const { addNexWindow } = await import("../src/lib/nex-windows.ts");
const now = new Date("2026-10-14T12:00:00Z");
const mission = (id, patch = {}) => ({
  id,
  title: id,
  notes: null,
  status: "A fazer",
  priority: "Média",
  rank: "C",
  duration_minutes: 25,
  project_id: null,
  due_at: null,
  ...patch,
});
const workspace = (patch = {}) => ({
  missions: [],
  projects: [],
  calendarCommitments: [],
  academicSchedule: [],
  checkin: null,
  routines: [],
  routineCompletions: [],
  focusSessions: [],
  ...patch,
});
test("planning caps a manual budget at the next loaded calendar/study boundary and never splits a mission", () => {
  const w = workspace({
    missions: [
      mission("large", { priority: "Crítica", duration_minutes: 45 }),
      mission("fits", { duration_minutes: 20 }),
    ],
    calendarCommitments: [
      {
        id: "c",
        title: "Consulta",
        starts_at: "2026-10-14T12:30:00Z",
        ends_at: "2026-10-14T13:00:00Z",
        is_optional: false,
      },
    ],
  });
  const plan = buildExecutionPlan(w, 90, undefined, now);
  assert.equal(plan.available, 30);
  assert.deepEqual(
    plan.steps.map((s) => s.mission.id),
    ["fits"],
  );
  assert.equal(plan.plannedMinutes, 20);
  assert.equal(plan.remaining, 10);
  w.academicSchedule = [
    {
      id: "s",
      subject: "Aula",
      weekday: 3,
      start_time: "09:15",
      end_time: "10:00",
    },
  ];
  assert.equal(buildExecutionPlan(w, 90, undefined, now).available, 15);
  assert.equal(
    buildExecutionPlan(w, 90, undefined, new Date("2026-10-14T12:20:00Z"))
      .available,
    0,
  );
});
test("planning ignores optional/all-day events, terminal/blocked/Inbox tasks and paused projects; estimates are explicit", () => {
  const w = workspace({
    projects: [{ id: "p", status: "Em espera" }],
    missions: [
      mission("unknown", { duration_minutes: null }),
      mission("blocked", { status: "Bloqueada" }),
      mission("inbox", { status: "Inbox" }),
      mission("done", { status: "Feita" }),
      mission("paused", { project_id: "p" }),
    ],
    calendarCommitments: [
      {
        id: "o",
        title: "Opcional",
        starts_at: "2026-10-14T12:05:00Z",
        ends_at: "2026-10-14T12:30:00Z",
        is_optional: true,
      },
      {
        id: "all",
        title: "Dia",
        starts_at: "2026-10-14T03:00:00Z",
        ends_at: "2026-10-15T03:00:00Z",
        is_optional: false,
      },
    ],
  });
  const plan = buildExecutionPlan(w, 60, undefined, now);
  assert.equal(plan.available, 60);
  assert.equal(plan.steps.length, 1);
  assert.equal(plan.steps[0].estimated, true);
  assert.equal(plan.steps[0].minutes, 45);
  assert.equal(plan.blocked, 1);
  assert.equal(plan.inbox, 1);
  assert.equal(buildExecutionPlan(w, 45, "unknown", now).steps.length, 0);
});
test("planner does not cross Sao Paulo midnight and uses only today's checkin across browser timezones", () => {
  const w = workspace({
    missions: [mission("a")],
    checkin: {
      checkin_date: "2026-10-13",
      energy: 1,
      focus: 1,
      stress: 10,
      sleep_quality: 1,
    },
  });
  for (const tz of ["UTC", "Asia/Tokyo", "America/Sao_Paulo"]) {
    process.env.TZ = tz;
    const p = buildExecutionPlan(
      w,
      90,
      undefined,
      new Date("2026-10-15T02:50:00Z"),
    );
    assert.equal(p.available, 10);
    assert.equal(p.steps.length, 0);
    assert.equal(p.readiness.label, "Base neutra");
  }
});
test("ranked plan is deterministic, capped at five and only accounts displayed steps", () => {
  const w = workspace({
    missions: Array.from({ length: 12 }, (_, i) =>
      mission(String(i), { duration_minutes: 15 }),
    ),
  });
  const copy = JSON.stringify(w),
    p = buildExecutionPlan(w, 240, undefined, now);
  assert.equal(p.steps.length, 5);
  assert.equal(p.plannedMinutes, 75);
  assert.equal(p.remaining, 165);
  assert.equal(JSON.stringify(w), copy);
  assert.equal(buildExecutionPlan(w, NaN, undefined, now).requested, 45);
  assert.deepEqual(
    buildExecutionPlan(w, 240, undefined, now).steps.map((s) => s.mission.id),
    p.steps.map((s) => s.mission.id),
  );
});
test("mission filters compose project, status, accent-insensitive terms, time and civil deadlines", () => {
  const list = [
    mission("a", {
      title: "Revisar Física",
      notes: "Óptica",
      project_id: "p",
      due_at: "2026-10-14T01:00:00Z",
    }),
    mission("b", {
      title: "Física",
      status: "Feita",
      due_at: "2026-10-14T01:00:00Z",
    }),
    mission("c", { duration_minutes: null }),
  ];
  assert.deepEqual(
    filterMissions(
      list,
      {
        query: "optica fisica",
        project: "p",
        minutes: 25,
        deadline: "overdue",
      },
      now,
    ).map((m) => m.id),
    ["a"],
  );
  assert.equal(filterMissions(list, { deadline: "overdue" }, now).length, 1);
  assert.deepEqual(
    filterMissions(list, { project: "none", minutes: 25 }, now).map(
      (m) => m.id,
    ),
    ["b"],
  );
});
test("project dossier preserves manual progress and distinguishes completed focus from planned/cancelled time", () => {
  const p = { id: "p", name: "NexOS", status: "Ativo", progress: 12 };
  const w = workspace({
    projects: [p],
    missions: [
      mission("a", { project_id: "p" }),
      mission("b", { project_id: "p", status: "Feita" }),
      mission("blocked", { project_id: "p", status: "Bloqueada" }),
    ],
    focusSessions: [
      { mission_id: "b", status: "completed", actual_minutes: 23 },
      { mission_id: "a", status: "cancelled", actual_minutes: 15 },
      { mission_id: "other", status: "completed", actual_minutes: 100 },
    ],
  });
  const summary = projectSummary(p, w, now);
  assert.equal(summary.focusMinutes, 23);
  assert.equal(summary.done, 1);
  assert.equal(summary.blocked, 1);
  assert.equal(summary.next.id, "a");
  assert.equal(p.progress, 12);
  assert.match(projectReadout("nexos", w, now).reply, /23 min/);
  assert.match(
    projectReadout("unknown", w, now).reply,
    /Não encontrei um único/,
  );
});
test("expanded local grammar remains bounded, rejects prototype keys, and returns action proposals rather than execution", () => {
  assert.deepEqual(parseLocalIntent("Tenho 25 minutos"), {
    kind: "plan",
    minutes: 25,
  });
  assert.deepEqual(parseLocalIntent("Plano do dia"), {
    kind: "plan",
    minutes: 45,
  });
  assert.deepEqual(parseLocalIntent("Iniciar missão: Revisar física"), {
    kind: "missionStatus",
    title: "Revisar física",
    status: "Em andamento",
  });
  assert.deepEqual(parseLocalIntent("Bloquear missão: A e B"), {
    kind: "missionStatus",
    title: "A e B",
    status: "Bloqueada",
  });
  assert.deepEqual(parseLocalIntent("Resumo do projeto: NexOS"), {
    kind: "project",
    title: "NexOS",
  });
  for (const raw of [
    "constructor",
    "toString",
    "__proto__",
    "Tenho 500 minutos",
    "Tenho 5 minutos",
    "Tenho 25 minutos e conclua tudo",
    "Iniciar missão: " + "a".repeat(201),
  ])
    assert.equal(parseLocalIntent(raw), null, raw);
});
test("local day views filter routines, studies and focus by Sao Paulo day; empty is not fabricated", () => {
  const w = workspace({
    routines: [
      {
        id: "r",
        is_active: true,
        days_of_week: [3],
        routine_items: [{ id: "i" }],
      },
      { id: "daily", is_active: true, days_of_week: [], routine_items: [] },
      { id: "off", is_active: false, days_of_week: [3] },
    ],
    routineCompletions: [
      { routine_item_id: "i", completion_date: "2026-10-14" },
    ],
    academicSchedule: [
      { id: "s", weekday: 3, start_time: "09:00", end_time: "10:00" },
      { id: "other", weekday: 4, start_time: "08:00" },
    ],
    focusSessions: [
      {
        id: "f",
        started_at: "2026-10-14T12:00:00Z",
        status: "completed",
        actual_minutes: 25,
      },
    ],
  });
  assert.match(
    localViewReadout("routinesToday", w, now).records[0].note,
    /1 de 1/,
  );
  assert.equal(localViewReadout("routinesToday", w, now).records.length, 2);
  assert.equal(localViewReadout("studiesToday", w, now).records.length, 1);
  assert.equal(localViewReadout("focusToday", w, now).records.length, 1);
  assert.deepEqual(localViewReadout("blocked", w, now).records, []);
});
test("reopening a plan updates its input without replacing its window or a draft", () => {
  const w = {
    id: "stable",
    key: "plan",
    title: "Plan",
    body: { kind: "plan", minutes: 45 },
    minimized: true,
  };
  const updated = addNexWindow([w], {
    ...w,
    id: "other",
    body: { kind: "plan", minutes: 25 },
  });
  assert.equal(updated[0].id, "stable");
  assert.equal(updated[0].body.minutes, 25);
  assert.equal(updated[0].minimized, false);
  const draft = { ...w, body: { kind: "compose", area: "calendario" } };
  assert.equal(addNexWindow([draft], w)[0].body.kind, "compose");
});

test("custom focus durations stay exact within the existing database limits", async () => {
  const { validFocusMinutes } = await import("../src/lib/focus-clock.ts");
  for (const n of [1, 15, 20, 25, 45, 240])
    assert.equal(validFocusMinutes(n), true);
  for (const n of [0, -1, 241, NaN, Infinity, 20.5, "20"])
    assert.equal(validFocusMinutes(n), false);
});
