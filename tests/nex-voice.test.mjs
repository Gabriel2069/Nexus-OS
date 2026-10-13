import test from "node:test";
import assert from "node:assert/strict";
import { localNexCommand } from "../src/lib/nex-tools.ts";
import { panels } from "../src/lib/nex-tools.ts";
import { voiceBoundary } from "../src/lib/voice-boundary.ts";
const initial = () => ({
  started: 0,
  lastSound: 0,
  voiced: 0,
  heard: false,
  lastFrame: 0,
});
test("Voice turns require sustained speech then silence; short clicks do not send audio", () => {
  let state = initial();
  state = voiceBoundary(state, 0.2, 100).next;
  assert.equal(state.heard, false);
  const silent = voiceBoundary(state, 0, 1700);
  assert.equal(silent.stop, false);
  assert.equal(silent.next.heard, false);
  state = voiceBoundary(silent.next, 0.2, 1800).next;
  state = voiceBoundary(state, 0.2, 1900).next;
  assert.equal(state.heard, true);
  assert.equal(voiceBoundary(state, 0, 3300).stop, false);
  assert.equal(voiceBoundary(state, 0, 3400).stop, true);
});
test("Voice turns stop at twelve seconds of silence or twenty-nine seconds of speech", () => {
  assert.equal(voiceBoundary(initial(), 0, 11999).stop, false);
  assert.equal(voiceBoundary(initial(), 0, 12000).stop, true);
  let state = initial();
  for (let now = 100; now <= 29000; now += 100) {
    const result = voiceBoundary(state, 0.2, now);
    assert.equal(result.stop, now === 29000);
    state = result.next;
  }
});

test("Local voice navigation accepts exact registered destinations and never interprets mutations or URLs", () => {
  assert.deepEqual(localNexCommand("Abra o calendário."), {
    kind: "navigate",
    area: "calendario",
  });
  assert.deepEqual(localNexCommand("ir para a caixa de entrada"), {
    kind: "navigate",
    area: "inbox",
  });
  assert.deepEqual(localNexCommand("Parar conversa"), { kind: "stop" });
  for (const value of [
    "abra https://evil.example",
    "exclua as missões",
    "conclua tudo",
    "como posso abrir uma tarefa?",
    "abra a agenda e apague tudo",
  ])
    assert.equal(localNexCommand(value), null);
});
test("Google response panels use only three read-only mappings; no file IDs, URLs or unsupported services from a model", () => {
  assert.deepEqual(
    panels([
      { area: "calendario", google: "calendar", url: "https://evil.example" },
      { area: "calendario" },
      { area: "calendario", google: "calendar" },
      { area: "biblioteca", google: "drive", id: "forged" },
    ]),
    [{ area: "calendario", google: "calendar" }, { area: "calendario" }],
  );
  assert.deepEqual(
    panels([
      { area: "hoje", google: "calendar" },
      { area: "biblioteca", google: "gmail" },
      { area: "biblioteca", google: "docs" },
    ]),
    [],
  );
});
