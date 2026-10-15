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
const { commandCatalog, filterCommandCatalog, catalogCommand } = await import(
  "../src/lib/nex-command-catalog.ts"
);
const { parseLocalIntent, localViewReadout } = await import(
  "../src/lib/nex-local.ts"
);
const { entityPath } = await import("../src/lib/navigation-state.ts");
test("command library exposes only recognized local grammar and requires personal text for sample actions", () => {
  assert.equal(
    new Set(commandCatalog.map((c) => c.example)).size,
    commandCatalog.length,
  );
  for (const c of commandCatalog) {
    assert.ok(parseLocalIntent(c.example), c.example);
    if (c.parameter) {
      assert.equal(catalogCommand(c), null, c.example);
      assert.equal(catalogCommand(c, "  "), null);
      assert.equal(
        catalogCommand(c, "x".repeat(c.parameter.maxLength + 1)),
        null,
      );
      const text = catalogCommand(c, "Meu título: e conclua tudo");
      assert.ok(text);
      const intent = parseLocalIntent(text);
      assert.notEqual(intent?.kind, "navigate");
    } else assert.equal(catalogCommand(c), c.example);
  }
  assert.equal(filterCommandCatalog("BLOQUEAR MISSAO").length, 1);
  assert.equal(filterCommandCatalog("inventadoausente").length, 0);
  assert.ok(
    filterCommandCatalog("", "google").every((c) => /google/i.test(c.example)),
  );
});
test("routine deep links treat identifiers as data; next step follows sorted incomplete items on the Sao Paulo day", () => {
  assert.equal(
    entityPath("routine", "r&project=x"),
    "/rotinas?routine=r%26project%3Dx",
  );
  const w = {
    missions: [],
    projects: [],
    focusSessions: [],
    academicSchedule: [],
    routineCompletions: [
      { routine_item_id: "done", completion_date: "2026-10-14" },
    ],
    routines: [
      {
        id: "r",
        is_active: true,
        days_of_week: [],
        routine_items: [
          { id: "later", title: "Depois", sort_order: 4 },
          { id: "next", title: "Primeiro", sort_order: 2 },
          { id: "done", title: "Feito", sort_order: 1 },
        ],
      },
    ],
  };
  const before = JSON.stringify(w);
  const read = localViewReadout(
    "routinesToday",
    w,
    new Date("2026-10-15T01:00:00Z"),
  );
  assert.equal(read.records[0].next_action, "Primeiro");
  assert.match(read.records[0].note, /1 de 3/);
  assert.equal(JSON.stringify(w), before);
  w.routineCompletions.push(
    { routine_item_id: "next", completion_date: "2026-10-14" },
    { routine_item_id: "later", completion_date: "2026-10-14" },
  );
  assert.equal(
    localViewReadout("routinesToday", w, new Date("2026-10-15T01:00:00Z"))
      .records[0].next_action,
    "Etapas de hoje concluídas",
  );
});
