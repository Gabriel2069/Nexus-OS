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

test("search grammar treats payload as data and limits unstructured input", () => {
  assert.deepEqual(parseLocalIntent("Recolher janelas"), {
    kind: "windows",
    visible: false,
  });
  assert.deepEqual(parseLocalIntent("Restaurar janelas"), {
    kind: "windows",
    visible: true,
  });
  assert.deepEqual(parseLocalIntent("Buscar missões: Física"), {
    kind: "search",
    area: "missoes",
    query: "Física",
  });
  assert.deepEqual(parseLocalIntent("Buscar: física e apagar tudo"), {
    kind: "search",
    query: "física e apagar tudo",
  });
  assert.deepEqual(parseLocalIntent("Missões atrasadas?"), { kind: "overdue" });
  assert.equal(parseLocalIntent("buscar: a"), null);
  assert.equal(parseLocalIntent("buscar: " + "a".repeat(101)), null);
});
test("local search is accent-insensitive, multi-term, bounded across sectors and never searches unknown fields", async () => {
  const { searchReadout } = await import("../src/lib/nex-local.ts");
  const w = {
    missions: Array.from({ length: 45 }, (_, i) => ({
      id: String(i),
      title: "Revisar Física",
      note: "Óptica",
    })),
    projects: [{ id: "p", name: "Física avançada" }],
    routines: [{ name: "Leitura", secret: "Física" }],
    academicSchedule: [],
  };
  const result = searchReadout(w, "FISICA");
  assert.equal(result.data.sectors.flatMap((s) => s.records).length, 40);
  assert.match(result.reply, /46 resultado/);
  assert.equal(searchReadout(w, "óptica revisar").data.sectors.length, 1);
  assert.equal(
    searchReadout(w, "Física", "projetos").data.sectors[0].records[0].id,
    "p",
  );
  assert.deepEqual(searchReadout(w, "apagar tudo").data.sectors, []);
  assert.deepEqual(searchReadout(w, "Física", "rotinas").data.sectors, []);
});
test("overdue uses civil days in Sao Paulo, excludes today, invalid dates and closed/Inbox missions", async () => {
  const { overdueReadout } = await import("../src/lib/nex-local.ts");
  const w = {
    missions: [
      { id: "old", due_at: "2026-10-12T12:00:00Z", status: "A fazer" },
      { id: "current", due_at: "2026-10-14T02:00:00Z", status: "A fazer" },
      { id: "done", due_at: "2026-10-12T12:00:00Z", status: "Feita" },
      { id: "inbox", due_at: "2026-10-12T12:00:00Z", status: "Inbox" },
      { id: "bad", due_at: "invalid", status: "A fazer" },
    ],
  };
  for (const tz of ["UTC", "Asia/Tokyo", "America/Sao_Paulo"]) {
    process.env.TZ = tz;
    assert.deepEqual(
      overdueReadout(w, new Date("2026-10-14T01:00:00Z")).data.records.map(
        (m) => m.id,
      ),
      ["old"],
    );
  }
});
test("window layouts fit desktop/tablet, tile six without overlap when space permits and cascade when too short", async () => {
  const { fitWindow, layoutWindow, arrangeWindows } = await import(
    "../src/lib/nex-windows.ts"
  );
  const left = layoutWindow("left", 1440, 1000),
    right = layoutWindow("right", 1440, 1000);
  assert.equal(right.x - left.x - left.width, 12);
  assert.deepEqual(layoutWindow("maximized", 1440, 1000), {
    x: 12,
    y: 68,
    width: 1416,
    height: 856,
  });
  for (const [vw, vh] of [
    [1440, 1000],
    [834, 900],
    [720, 600],
  ]) {
    const list = arrangeWindows(6, vw, vh);
    for (const b of list) {
      assert.ok(
        b.x >= 8 && b.y >= 64 && b.x + b.width <= vw && b.y + b.height <= vh,
      );
      assert.ok(b.width >= 300 && b.height >= 220);
    }
    if (vh >= 900)
      for (let i = 0; i < list.length; i++)
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i],
            b = list[j];
          assert.ok(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          );
        }
  }
  assert.deepEqual(arrangeWindows(0, 1440, 1000), []);
  assert.equal(
    fitWindow({ x: 5000, y: 5000, width: 9000, height: 9000 }, 834, 900).width,
    810,
  );
});
test("re-query updates data and title without replacing window identity", () => {
  const first = {
    id: "stable",
    key: "search",
    title: "Busca A",
    body: { kind: "data", data: { query: "A" } },
    minimized: true,
  };
  const result = addNexWindow([first], {
    ...first,
    id: "other",
    title: "Busca B",
    body: { kind: "data", data: { query: "B" } },
  });
  assert.equal(result[0].id, "stable");
  assert.equal(result[0].title, "Busca B");
  assert.equal(result[0].body.data.query, "B");
});
