import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { operation, panels } from "../src/lib/nex-tools.ts";
import { route } from "../worker/nex/routes.ts";
import { seal, base64 } from "../worker/nex/core.ts";
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
const env = {
  SUPABASE_URL: "https://db.example",
  SUPABASE_PUBLISHABLE_KEY: "public-test",
  NEX_TOKEN_ENCRYPTION_KEY: base64(new Uint8Array(32).fill(7)),
};
const req = (path, input) =>
  new Request("https://app.example/api/nex/" + path, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer session-test",
      Origin: "https://app.example",
    },
    body: input === undefined ? undefined : JSON.stringify(input),
  });
async function mock(fn, run) {
  const previous = globalThis.fetch,
    calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return fn(String(url), init);
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = previous;
  }
}
test("A02 contracts: allowlists, cents, civil dates, scope stripping and exact microsecond versions", () => {
  const edit = operation({
    kind: "mission.edit",
    payload: {
      id: a,
      title: "Editar",
      expected_updated_at: "2026-10-13T10:00:00.123456Z",
      xp: 999,
      user_id: b,
      url: "https://evil.test",
    },
  });
  assert.equal(edit.payload.expected_updated_at, "2026-10-13T10:00:00.123456Z");
  assert.equal(edit.payload.xp, undefined);
  assert.equal(edit.payload.user_id, undefined);
  assert.equal(
    operation({
      kind: "mission.edit",
      payload: { id: a, title: "Reabrir", status: "Feita" },
    }),
    null,
  );
  assert.equal(operation({ kind: "__proto__", payload: {} }), null);
  assert.equal(
    operation({
      kind: "finance.create",
      payload: {
        title: "Teste",
        kind: "expense",
        amount: 10.123,
        entry_date: "2026-10-13",
      },
    }),
    null,
  );
  assert.equal(
    operation({
      kind: "finance.create",
      payload: {
        title: "Teste",
        kind: "expense",
        amount: 10,
        entry_date: "2026-02-30",
      },
    }),
    null,
  );
  assert.equal(
    operation({ kind: "checkin.save", payload: { energy: 10, focus: 9 } })
      .payload.energy,
    10,
  );
  assert.deepEqual(
    panels([
      { area: "hoje" },
      { area: "hoje" },
      { area: "https://evil.test" },
      { area: "projetos" },
    ]),
    [{ area: "hoje" }, { area: "projetos" }],
  );
});
test("A02 HTTP: preview ownership, boolean-only diagnostics and confirmation before invoker RPC", async () => {
  await mock(
    (url) =>
      url.endsWith("/auth/v1/user")
        ? Response.json({ id: a })
        : url.includes("missions?")
          ? Response.json([
              {
                id: a,
                title: "Atual",
                updated_at: "2026-10-13T10:00:00.123456Z",
              },
            ])
          : url.includes("rpc/nex_apply_operation")
            ? Response.json({ applied: true, id: a, area: "missoes" })
            : Response.json([]),
    async (calls) => {
      const op = { kind: "mission.edit", payload: { id: a, title: "Novo" } };
      const preview = await (
        await route(req("operations/preview", { operation: op }), env)
      ).json();
      assert.equal(
        preview.operation.payload.expected_updated_at,
        "2026-10-13T10:00:00.123456Z",
      );
      assert.ok(calls.some((c) => c.url.includes("user_id=eq." + a)));
      assert.equal(
        (
          await route(
            req("operations/execute", { id: b, operation: preview.operation }),
            env,
          )
        ).status,
        400,
      );
      assert.equal(
        calls.filter((c) => c.url.includes("rpc/nex_apply_operation")).length,
        0,
      );
      assert.equal(
        (
          await route(
            req("operations/execute", {
              id: b,
              operation: preview.operation,
              confirmed: true,
            }),
            env,
          )
        ).status,
        200,
      );
      const status = await (
        await route(req("status"), {
          ...env,
          GROQ_API_KEY: "never-expose-this-value",
          NEX_GROQ_FREE_ONLY: "true",
        })
      ).json();
      assert.equal(status.configuration.groq.keyPresent, true);
      assert.equal(JSON.stringify(status).includes("never-expose"), false);
    },
  );
});
test("A02 Google writes: encrypted token, minimal scope, fixed endpoint, no invitations, no pending retry", async () => {
  const ciphertext = await seal(
    env,
    {
      access_token: "test-only-token",
      expires_at: Date.now() + 3600000,
      scope: "https://www.googleapis.com/auth/calendar.events",
    },
    a,
  );
  let pending = false;
  await mock(
    (url, init) => {
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: a });
      if (url.includes("nex_google_connections"))
        return Response.json([{ ciphertext }]);
      if (url.includes("nex_operation_history"))
        return Response.json(pending ? [{ id: b, state: "pending" }] : []);
      if (url.includes("nex_reserve")) return Response.json(true);
      if (url.includes("nex_claim_operation"))
        return Response.json({ claimed: true });
      if (url.includes("nex_finish_operation"))
        return Response.json({ applied: true });
      if (url.startsWith("https://www.googleapis.com/calendar/")) {
        const p = JSON.parse(init.body);
        assert.equal(p.attendees, undefined);
        assert.equal(p.id, b.replaceAll("-", ""));
        return Response.json({ id: p.id });
      }
      throw Error("Unexpected endpoint");
    },
    async (calls) => {
      const input = {
        id: b,
        confirmed: true,
        operation: {
          kind: "google.calendar.create",
          payload: {
            title: "Teste",
            starts_at: "2026-10-13T10:00:00-03:00",
            ends_at: "2026-10-13T11:00:00-03:00",
          },
        },
      };
      assert.equal(
        (await route(req("operations/execute", input), env)).status,
        200,
      );
      pending = true;
      assert.equal(
        (await route(req("operations/execute", input), env)).status,
        409,
      );
      assert.equal(
        calls.filter((c) =>
          c.url.startsWith("https://www.googleapis.com/calendar/"),
        ).length,
        1,
      );
      assert.equal(
        (
          await route(
            req("operations/execute", {
              ...input,
              operation: {
                kind: "google.task.create",
                payload: { title: "Sem escopo" },
              },
            }),
            env,
          )
        ).status,
        409,
      );
    },
  );
});
test("A02 weather: reserve before requests, explicit coarse city and no GPS use", async () => {
  await mock(
    (url) =>
      url.endsWith("/auth/v1/user")
        ? Response.json({ id: a })
        : url.includes("nex_reserve")
          ? Response.json(true)
          : url.includes("geocoding-api")
            ? Response.json({
                results: [
                  { name: "Lisboa", latitude: 38.71667, longitude: -9.13333 },
                ],
              })
            : Response.json({ current: { temperature_2m: 20 } }),
    async (calls) => {
      const r = await route(
        req("weather", { city: "Lisboa", latitude: 0, longitude: 0 }),
        env,
      );
      assert.equal(r.status, 200);
      const data = await r.json();
      assert.match(data.attribution, /CC BY 4.0/);
      assert.ok(calls[1].url.includes("nex_reserve"));
      assert.match(calls[3].url, /latitude=38.72&longitude=-9.13/);
    },
  );
  await mock(
    (url) =>
      url.endsWith("/auth/v1/user")
        ? Response.json({ id: a })
        : Response.json(false),
    async (calls) => {
      assert.equal(
        (await route(req("weather", { city: "Lisboa" }), env)).status,
        429,
      );
      assert.equal(calls.length, 2);
    },
  );
});
test("A02 PostgreSQL: RLS, ledger, deduplication, stale edits, atomic routine and original reward motor", async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      "create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;",
    );
    for (const name of [
      "20260808223500_nexus_core",
      "20260808231500_nexus_routine_engine",
      "20260809022500_nexus_academic_hub",
      "20260809043000_contextual_calendar_commitments",
      "20260809044500_personal_finance_entries",
      "20261013142948_nex_intelligence",
      "20261013155850_nex_intelligence_privilege_hardening",
      "20261013170035_nex_orbital_tools",
    ]) {
      await pg.exec(
        readFileSync("supabase/migrations/" + name + ".sql", "utf8").replace(
          "create extension if not exists pgcrypto;",
          "",
        ),
      );
    }
    await pg.exec(
      "insert into auth.users values ('" +
        a +
        "'),('" +
        b +
        "');insert into public.profiles(id) values('" +
        a +
        "'),('" +
        b +
        "');",
    );
    const asUser = async (user) =>
      pg.exec(
        "reset role;set role authenticated;set request.jwt.claim.sub='" +
          user +
          "';",
      );
    await asUser(a);
    let i = 0;
    const id = () => "aaaaaaaa-aaaa-4aaa-8aaa-" + String(++i).padStart(12, "0");
    const apply = async (kind, payload, action = id()) =>
      (
        await pg.query(
          "select public.nex_apply_operation($1,$2,$3) as result",
          [action, kind, JSON.stringify(payload)],
        )
      ).rows[0].result;
    const action = id(),
      first = await apply("project.create", { name: "Teste" }, action);
    assert.equal(
      (await apply("project.create", { name: "Teste" }, action)).id,
      first.id,
    );
    await assert.rejects(
      apply("project.create", { name: "Outro" }, action),
      /Conflicting/,
    );
    let version = (
      await pg.query("select updated_at::text from projects where id=$1", [
        first.id,
      ])
    ).rows[0].updated_at;
    await assert.rejects(
      apply("project.edit", {
        id: first.id,
        name: "Stale",
        expected_updated_at: "2000-01-01T00:00:00Z",
      }),
      /changed/,
    );
    await apply("project.edit", {
      id: first.id,
      name: "Atual",
      expected_updated_at: version,
    });
    await asUser(b);
    await assert.rejects(
      apply("project.edit", {
        id: first.id,
        name: "Outro dono",
        expected_updated_at: version,
      }),
      /changed/,
    );
    assert.equal((await pg.query("select * from projects")).rows.length, 0);
    await assert.rejects(
      pg.query("select * from nex_private.operations"),
      /permission denied/,
    );
    await asUser(a);
    const routine = await apply("routine.create", {
      name: "Rotina",
      steps: ["Etapa 1", "Etapa 2"],
    });
    assert.equal(
      (
        await pg.query(
          "select count(*)::int as n from routine_items where routine_id=$1",
          [routine.id],
        )
      ).rows[0].n,
      2,
    );
    await assert.rejects(
      apply("routine.create", { name: "Inválida", steps: ["ok", ""] }),
      /Invalid/,
    );
    assert.equal(
      (await pg.query("select count(*)::int as n from routines")).rows[0].n,
      1,
    );
    await apply("finance.create", {
      title: "R$ 10,25",
      kind: "expense",
      amount: 10.25,
      entry_date: "2026-10-13",
      status: "planned",
    });
    await apply("checkin.save", { energy: 10, focus: 7 });
    await assert.rejects(
      apply("checkin.save", { energy: 5, focus: 5 }),
      /changed/,
    );
    await apply("review.save", { note: "Revisão" });
    await apply("memory.save", {
      module: "financas",
      content: "Memória explícita",
    });
    const event = {
      external_id: "google:test",
      title: "Agenda",
      starts_at: "2026-10-13T10:00:00Z",
      ends_at: "2026-10-13T11:00:00Z",
    };
    assert.equal(
      (await apply("google.calendar.import", { events: [event] })).imported,
      1,
    );
    assert.equal(
      (await apply("google.calendar.import", { events: [event] })).preserved,
      1,
    );
    const mission = (
      await pg.query(
        "insert into missions(user_id,title,xp_base) values($1,'Completar',20) returning id,updated_at::text",
        [a],
      )
    ).rows[0];
    const completion = id(),
      payload = { id: mission.id, expected_updated_at: mission.updated_at };
    await apply("mission.complete", payload, completion);
    await apply("mission.complete", payload, completion);
    assert.equal(
      (await pg.query("select xp_total from profiles where id=$1", [a])).rows[0]
        .xp_total,
      20,
    );
    version = (
      await pg.query("select updated_at::text from missions where id=$1", [
        mission.id,
      ])
    ).rows[0].updated_at;
    await assert.rejects(
      apply("mission.edit", {
        id: mission.id,
        title: "Reabrir",
        status: "A fazer",
        expected_updated_at: version,
      }),
      /cannot be reopened/,
    );
    const pending = id();
    await pg.query(
      "select public.nex_claim_operation($1,'google.task.create','{}')",
      [pending],
    );
    await assert.rejects(
      pg.query(
        "select public.nex_claim_operation($1,'google.task.create','{}')",
        [pending],
      ),
      /pending/,
    );
    await pg.exec("reset role;set role anon;");
    await assert.rejects(
      pg.query("select public.nex_operation_history()"),
      /permission denied/,
    );
  } finally {
    await pg.close();
  }
});
