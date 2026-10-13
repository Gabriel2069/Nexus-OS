import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanPaths,
  entityPath,
  normalizeSearch,
} from "../src/lib/navigation-state.ts";
test("pinned preferences reject foreign routes, duplicates and invalid data, with an explicit limit", () => {
  const allowed = [
    "/hoje",
    "/missoes",
    "/projetos",
    "/foco",
    "/inbox",
    "/estudos",
    "/rotinas",
  ];
  assert.deepEqual(
    cleanPaths(
      [
        "/hoje",
        "https://outside.example",
        "/hoje",
        false,
        "/unknown",
        ...allowed,
      ],
      allowed,
    ),
    allowed.slice(0, 6),
  );
  assert.deepEqual(cleanPaths(null, allowed), []);
  assert.deepEqual(cleanPaths([], allowed), []);
});
test("entity links encode identifiers as data inside a fixed internal route", () => {
  const path = entityPath("mission", "id&project=other#fragment");
  const url = new URL(path, "https://nexos.example");
  assert.equal(url.pathname, "/missoes");
  assert.equal(url.searchParams.get("mission"), "id&project=other#fragment");
  assert.equal(url.searchParams.has("project"), false);
  assert.equal(url.hash, "");
  assert.equal(entityPath("project", "p1"), "/projetos?project=p1");
});
test("search accepts whitespace, case and diacritics without losing token boundaries", () => {
  assert.equal(normalizeSearch("  FINANÇAS e Revisão  "), "financas e revisao");
  assert.equal(normalizeSearch("Matemática"), normalizeSearch("matematica"));
});
