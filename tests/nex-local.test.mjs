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
const { parseLocalIntent, dayReadout, localReadout } = await import(
  "../src/lib/nex-local.ts"
);
const { addNexWindow, clampWindow } = await import("../src/lib/nex-windows.ts");
test("local grammar routes bounded queries and preserves titles as data; ambiguous prose stays unknown", () => {
  assert.deepEqual(parseLocalIntent("Agenda de amanhã?"), {
    kind: "agenda",
    offset: 1,
  });
  assert.deepEqual(parseLocalIntent("Mostre meus projetos"), {
    kind: "read",
    area: "projetos",
  });
  assert.deepEqual(parseLocalIntent("Agenda Google"), {
    kind: "google",
    service: "calendar",
  });
  assert.deepEqual(parseLocalIntent("Criar missão: Revisar Física e Química"), {
    kind: "proposal",
    target: "mission",
    title: "Revisar Física e Química",
  });
  assert.deepEqual(parseLocalIntent("Criar tarefa Google: Redação"), {
    kind: "operation",
    operation: { kind: "google.task.create", payload: { title: "Redação" } },
  });
  for (const s of [
    "mostre agenda e apague tudo",
    "conclua tudo",
    "oi e transfira dinheiro",
    "abra https://evil.example",
    "Criar projeto: " + "a".repeat(201),
    "qualquer pergunta livre",
  ])
    assert.equal(parseLocalIntent(s), null, s);
});
test("day readout uses Sao Paulo civil dates, recurring agenda and excludes completed deadlines", () => {
  const w = {
    calendarCommitments: [
      {
        id: "c",
        title: "Aula",
        start_time: "08:00",
        end_time: "09:00",
        weekdays: [3],
        is_fixed: true,
      },
    ],
    missions: [
      {
        id: "a",
        title: "Física",
        due_at: "2026-10-14T02:00:00Z",
        status: "A fazer",
      },
      {
        id: "b",
        title: "Feita",
        due_at: "2026-10-14T02:00:00Z",
        status: "Feita",
      },
    ],
  };
  for (const tz of ["UTC", "Asia/Tokyo", "America/Sao_Paulo"]) {
    process.env.TZ = tz;
    const now = new Date("2026-10-14T01:00:00Z");
    const today = dayReadout(w, 0, now),
      tomorrow = dayReadout(w, 1, now);
    assert.equal(today.title, "Agenda · 2026-10-13");
    assert.equal(today.data.sectors[1].records.length, 1);
    assert.equal(tomorrow.data.sectors[0].records.length, 1);
  }
});
test("local readouts are bounded and do not fabricate unsupported sectors", () => {
  const w = {
    missions: Array.from({ length: 60 }, (_, i) => ({
      id: String(i),
      status: i === 0 ? "Feita" : "A fazer",
    })),
    projects: [],
    dailyCheckins: [],
    academicSchedule: [],
    routines: [],
    calendarCommitments: [],
    focusSessions: [],
    weeklyReviews: [],
    activity: [],
    attributes: [],
  };
  assert.equal(localReadout("missoes", w).records.length, 40);
  assert.equal(localReadout("financas", w), null);
  assert.equal(
    localReadout("missoes", w).records.some((x) => x.id === "0"),
    false,
  );
});
test("window deduplication preserves drafts and pending approvals, capacity never silently evicts", () => {
  const win = (i) => ({
    id: String(i),
    key: String(i),
    title: String(i),
    body: { kind: "compose", area: "calendario" },
    minimized: false,
  });
  let list = Array.from({ length: 6 }, (_, i) => win(i));
  assert.equal(addNexWindow(list, win(7)), list);
  list[2].minimized = true;
  const next = addNexWindow(list, {
    ...win(2),
    body: { kind: "data", data: {} },
  });
  assert.equal(next.length, 6);
  assert.equal(next.at(-1).id, "2");
  assert.equal(next.at(-1).body.kind, "compose");
  assert.equal(next.at(-1).minimized, false);
  const approval = {
    ...win(2),
    body: { kind: "operation", operationId: "stable" },
  };
  const reopened = addNexWindow([approval], { ...approval, id: "new" });
  assert.equal(reopened[0].id, "2");
  assert.equal(reopened[0].body.operationId, "stable");
});
test("desktop dragging stays inside a usable viewport", () => {
  assert.deepEqual(clampWindow(-100, -100, 440, 510, 1440, 1000), {
    x: 8,
    y: 64,
  });
  assert.deepEqual(clampWindow(3000, 3000, 440, 510, 1440, 1000), {
    x: 992,
    y: 430,
  });
});
