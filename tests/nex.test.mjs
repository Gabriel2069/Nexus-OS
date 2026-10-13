import test from "node:test";
import assert from "node:assert/strict";
import { route, parseAnswer } from "../worker/nex/routes.ts";
import worker from "../worker/index.ts";
import { base64, seal, unseal } from "../worker/nex/core.ts";
import { complete, enabled, models } from "../worker/nex/providers.ts";
const who = {
  id: "11111111-1111-4111-8111-111111111111",
  token: "session-test",
};
const env = {
  SUPABASE_URL: "https://db.example",
  SUPABASE_PUBLISHABLE_KEY: "public-test",
  GROQ_API_KEY: "test-groq-not-real",
  GEMINI_API_KEY: "test-gemini-not-real",
  NEX_GROQ_FREE_ONLY: "true",
  NEX_GEMINI_FREE_ONLY: "true",
  NEX_TOKEN_ENCRYPTION_KEY: base64(new Uint8Array(32).fill(7)),
  GOOGLE_CLIENT_ID: "client-test",
  GOOGLE_CLIENT_SECRET: "secret-test-not-real",
  GOOGLE_REDIRECT_URI: "https://app.example/api/nex/google/callback",
};
const request = (path, input, opts = {}) =>
  new Request("https://app.example/api/nex/" + path, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      Authorization: "Bearer session-test",
      Origin: "https://app.example",
      ...opts.headers,
    },
    body: input === undefined ? undefined : JSON.stringify(input),
    ...opts,
  });
const ok = (value) => Response.json(value);
async function mock(fn, run) {
  const previous = globalThis.fetch;
  const calls = [];
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
const auth = (url) =>
  url.endsWith("/auth/v1/user") ? ok({ id: who.id }) : null;
test("provider flags deny calls by default; no paid model or automatic limit bypass", async () => {
  assert.deepEqual(
    enabled({
      ...env,
      NEX_GROQ_FREE_ONLY: "false",
      NEX_GEMINI_FREE_ONLY: "false",
    }),
    { groq: false, gemini: false, workers: false },
  );
  await mock(
    (url) => (url.includes("/rpc/nex_reserve") ? ok(false) : ok({})),
    async (calls) => {
      await assert.rejects(
        complete(env, who, [{ role: "user", content: "Oi" }]),
        (e) => e.status === 429,
      );
      assert.equal(calls.length, 1);
    },
  );
  await mock(
    (url) =>
      url.includes("/rpc/nex_reserve")
        ? ok(true)
        : new Response("", { status: 429 }),
    async (calls) => {
      await assert.rejects(
        complete(env, who, [{ role: "user", content: "Oi" }]),
        (e) => e.status === 429,
      );
      assert.equal(
        calls.filter((c) => c.url.includes("generativelanguage")).length,
        0,
      );
    },
  );
});
test("fallback on upstream 5xx reserves Gemini separately, caps completion, no grounding", async () => {
  await mock(
    (url) =>
      url.includes("/rpc/nex_reserve")
        ? ok(true)
        : url.includes("api.groq.com")
          ? new Response("", { status: 503 })
          : ok({
              candidates: [{ content: { parts: [{ text: "Resposta" }] } }],
            }),
    async (calls) => {
      const answer = await complete(env, who, [
        { role: "system", content: "Sistema" },
        { role: "user", content: "Oi" },
      ]);
      assert.equal(answer.provider, "gemini");
      assert.equal(answer.text, "Resposta");
      assert.equal(
        calls.filter((c) => c.url.includes("/rpc/nex_reserve")).length,
        2,
      );
      const payload = JSON.parse(calls.at(-1).init.body);
      assert.equal(payload.generationConfig.maxOutputTokens, 512);
      assert.equal(payload.tools, undefined);
      assert.equal(
        calls.at(-1).init.headers["x-goog-api-key"],
        env.GEMINI_API_KEY,
      );
    },
  );
});
test("unauthenticated, foreign origin, malformed, oversized and disabled requests make no provider call", async () => {
  await mock(
    (url) => auth(url) ?? ok({}),
    async (calls) => {
      assert.equal(
        (await route(new Request("https://app.example/api/nex/status"), env))
          .status,
        401,
      );
      const foreign = new Request("https://app.example/api/nex/chat", {
        method: "POST",
        headers: { Origin: "https://evil.example" },
        body: "{}",
      });
      assert.equal((await route(foreign, env)).status, 403);
      assert.equal((await route(request("chat", null), env)).status, 400);
      assert.equal(
        (await route(request("chat", { message: "x".repeat(18000) }), env))
          .status,
        413,
      );
      const disabled = {
        ...env,
        NEX_GROQ_FREE_ONLY: "false",
        NEX_GEMINI_FREE_ONLY: "false",
      };
      assert.equal(
        (
          await route(
            request("chat", { message: "Oi", module: "geral" }),
            disabled,
          )
        ).status,
        503,
      );
      assert.equal(
        calls.some((c) => c.url.includes("groq.com")),
        false,
      );
    },
  );
});
test("chat opt-in only; bounded module data always filters verified owner; tool text is not executed", async () => {
  await mock(
    (url) =>
      auth(url) ??
      (url.includes("/rpc/nex_reserve")
        ? ok(true)
        : url.includes("api.groq.com")
          ? ok({
              choices: [
                {
                  message: {
                    content:
                      '{"reply":"Vamos criar","proposal":{"kind":"mission","title":"Revisar"}}',
                  },
                },
              ],
            })
          : ok([])),
    async (calls) => {
      const result = await route(
        request("chat", {
          message: "Crie uma missão",
          module: "missoes",
          shareContext: false,
          user_id: "other-user",
        }),
        env,
      );
      assert.equal(result.status, 200);
      const data = await result.json();
      assert.equal(data.proposal.kind, "mission");
      assert.equal(
        calls.some((c) => c.url.includes("/missions?")),
        false,
      );
      assert.equal(
        calls.some((c) => c.url.includes("nex_create_mission")),
        false,
      );
      calls.length = 0;
      await route(
        request("chat", {
          message: "Consulte",
          module: "rotinas",
          shareContext: true,
        }),
        env,
      );
      const dbCall = calls.find((c) => c.url.includes("/routines?"));
      assert.match(dbCall.url, new RegExp("user_id=eq." + who.id));
      assert.match(dbCall.url, /id,name/);
    },
  );
  assert.equal(
    parseAnswer(
      '{"reply":"Teste","proposal":{"kind":"delete_all","title":"Apagar"}}',
    ).proposal,
    null,
  );
});
test("AES-GCM rejects another user, tampered ciphertext and wrong key", async () => {
  const secret = { access_token: "oauth-test-not-real" };
  const cipher = await seal(env, secret, who.id);
  assert.deepEqual(await unseal(env, cipher, who.id), secret);
  assert.equal(cipher.includes(secret.access_token), false);
  await assert.rejects(unseal(env, cipher, "other"));
  await assert.rejects(
    unseal(
      { ...env, NEX_TOKEN_ENCRYPTION_KEY: base64(new Uint8Array(32).fill(8)) },
      cipher,
      who.id,
    ),
  );
  await assert.rejects(unseal(env, cipher + "x", who.id));
});
test("A03 Google workspace consent groups only Calendar events, Tasks and app files; no implicit grant", async () => {
  await mock(
    (url) =>
      auth(url) ?? (url.includes("rpc/nex_reserve") ? ok(true) : ok(null)),
    async (calls) => {
      const r = await route(
        request("google/start", { service: "workspace" }),
        env,
      );
      assert.equal(r.status, 200);
      const url = new URL((await r.json()).url);
      assert.deepEqual(url.searchParams.get("scope").split(" "), [
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/tasks",
        "https://www.googleapis.com/auth/drive.file",
      ]);
      assert.equal(url.searchParams.get("code_challenge_method"), "S256");
      assert.equal(url.searchParams.get("include_granted_scopes"), "true");
      assert.ok(calls.every((c) => c.url.startsWith(env.SUPABASE_URL)));
      assert.equal(
        (await route(request("google/read", { service: "workspace" }), env))
          .status,
        400,
      );
    },
  );
});
for (const callbackPath of [
  "/api/nex/google/callback",
  "/api/integrations/google/callback",
])
  test(`Google incremental ${callbackPath}: PKCE, encrypted tokens, state consumed once`, async () => {
    const callbackEnv = {
      ...env,
      GOOGLE_REDIRECT_URI: "https://app.example" + callbackPath,
    };
    let stateRow = null,
      connection = null,
      consumed = 0;
    await mock(
      (url, init) => {
        if (auth(url)) return auth(url);
        if (url.includes("rpc/nex_reserve")) return ok(true);
        if (url.includes("/nex_oauth_states")) {
          if (init.method === "POST") {
            stateRow = JSON.parse(init.body);
            return ok(null);
          }
          if (init.method === "DELETE" && url.includes("state_hash=")) {
            const rows = stateRow ? [stateRow] : [];
            stateRow = null;
            consumed++;
            return ok(rows);
          }
          return new Response(null, { status: 204 });
        }
        if (url.includes("/nex_google_connections")) {
          if (init.method === "POST") {
            connection = JSON.parse(init.body);
            return ok(null);
          }
          return ok(connection ? [connection] : []);
        }
        if (url === "https://oauth2.googleapis.com/token") {
          const params = new URLSearchParams(init.body);
          assert.equal(params.get("code_verifier").length, 43);
          assert.equal(
            params.get("redirect_uri"),
            callbackEnv.GOOGLE_REDIRECT_URI,
          );
          return ok({
            access_token: "google-access-test",
            refresh_token: "google-refresh-test",
            expires_in: 3600,
            scope: "https://www.googleapis.com/auth/calendar.events.readonly",
          });
        }
        throw Error("Unexpected " + url);
      },
      async (calls) => {
        const start = await route(
          request("google/start", { service: "calendar" }),
          callbackEnv,
        );
        assert.equal(start.status, 200);
        const authUrl = new URL((await start.json()).url);
        assert.equal(
          authUrl.searchParams.get("redirect_uri"),
          callbackEnv.GOOGLE_REDIRECT_URI,
        );
        assert.equal(authUrl.searchParams.get("code_challenge_method"), "S256");
        assert.equal(
          authUrl.searchParams.get("include_granted_scopes"),
          "true",
        );
        assert.equal(
          authUrl.searchParams.get("scope"),
          "https://www.googleapis.com/auth/calendar.events.readonly",
        );
        const header = start.headers.get("Set-Cookie");
        assert.match(header, /HttpOnly; Secure; SameSite=Lax/);
        assert.equal(header.includes("session-test"), false);
        const cb = () =>
          new Request(
            callbackEnv.GOOGLE_REDIRECT_URI +
              "?" +
              new URLSearchParams({
                state: authUrl.searchParams.get("state"),
                code: "authorization-test",
              }),
            { headers: { Cookie: header.split(";")[0] } },
          );
        const otherPath =
          callbackPath === "/api/nex/google/callback"
            ? "/api/integrations/google/callback"
            : "/api/nex/google/callback";
        const wrongEndpoint = new Request(
          "https://app.example" +
            otherPath +
            "?" +
            new URL(cb().url).searchParams,
          { headers: { Cookie: header.split(";")[0] } },
        );
        const rejected = await worker.fetch(wrongEndpoint, callbackEnv);
        assert.equal(rejected.status, 400);
        assert.match(rejected.headers.get("Set-Cookie"), /Max-Age=0/);
        assert.equal(consumed, 0);
        assert.equal((await worker.fetch(cb(), callbackEnv)).status, 303);
        assert.equal(
          connection.ciphertext.includes("google-access-test"),
          false,
        );
        assert.equal((await worker.fetch(cb(), callbackEnv)).status, 400);
        assert.equal(
          calls.filter((c) => c.url === "https://oauth2.googleapis.com/token")
            .length,
          1,
        );
        assert.equal(consumed, 2);
      },
    );
  });
test("Google wrong state, denied service and callback mismatch never exchange token", async () => {
  await mock(
    (url) => auth(url) ?? ok(true),
    async (calls) => {
      assert.equal(
        (await route(request("google/start", { service: "toString" }), env))
          .status,
        400,
      );
      assert.equal(
        (
          await route(request("google/start", { service: "calendar" }), {
            ...env,
            GOOGLE_REDIRECT_URI: "https://evil.example/api/nex/google/callback",
          })
        ).status,
        503,
      );
      const value = await seal(
        env,
        {
          state: "right",
          verifier: "test",
          token: who.token,
          expires: Date.now() + 10000,
          origin: "https://app.example",
        },
        "oauth-flow",
      );
      assert.equal(
        (
          await route(
            new Request(
              "https://app.example/api/nex/google/callback?state=wrong&code=test",
              { headers: { Cookie: "__Host-nex-google=" + value } },
            ),
            env,
          )
        ).status,
        400,
      );
      assert.equal(
        calls.some((c) => c.url === "https://oauth2.googleapis.com/token"),
        false,
      );
    },
  );
});
test("actions require confirmation and use authenticated idempotent RPC, no reward RPC", async () => {
  await mock(
    (url) => auth(url) ?? ok("mission-id"),
    async (calls) => {
      assert.equal(
        (
          await route(
            request("actions", {
              id: who.id,
              kind: "mission",
              title: "Tarefa",
            }),
            env,
          )
        ).status,
        400,
      );
      const result = await route(
        request("actions", {
          id: who.id,
          kind: "mission",
          title: "Tarefa",
          confirmed: true,
          user_id: "other",
        }),
        env,
      );
      assert.equal(result.status, 200);
      const rpc = calls.find((c) => c.url.includes("nex_create_mission"));
      assert.equal(JSON.parse(rpc.init.body).p_title, "Tarefa");
      assert.equal(JSON.parse(rpc.init.body).user_id, undefined);
      assert.equal(
        calls.some((c) => c.url.includes("complete_mission")),
        false,
      );
    },
  );
});
test("invalid audio is rejected before Whisper quota or external upload", async () => {
  await mock(
    (url) => auth(url) ?? ok(true),
    async (calls) => {
      assert.equal(
        (await route(request("transcribe", { audio: btoa("not wav") }), env))
          .status,
        400,
      );
      assert.equal(
        calls.some(
          (c) =>
            c.url.includes("audio/transcriptions") ||
            c.url.includes("/rpc/nex_reserve"),
        ),
        false,
      );
    },
  );
  assert.equal(models.whisper, "whisper-large-v3-turbo");
});

test("bounded PCM audio reserves actual seconds before Whisper, secret never enters response", async () => {
  const bytes = new Uint8Array(32044),
    v = new DataView(bytes.buffer);
  const ascii = (o, s) => {
    for (let i = 0; i < s.length; i++) bytes[o + i] = s.charCodeAt(i);
  };
  ascii(0, "RIFF");
  v.setUint32(4, bytes.length - 8, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(36, "data");
  v.setUint32(40, 32000, true);
  await mock(
    (url, init) =>
      auth(url) ??
      (url.includes("/rpc/nex_reserve")
        ? ok(true)
        : ok({ text: "Organize meu dia" })),
    async (calls) => {
      const r = await route(
        request("transcribe", { audio: Buffer.from(bytes).toString("base64") }),
        env,
      );
      assert.equal(r.status, 200);
      assert.deepEqual(await r.json(), { text: "Organize meu dia" });
      const reservation = calls.find((c) => c.url.includes("/rpc/nex_reserve"));
      assert.deepEqual(JSON.parse(reservation.init.body), {
        p_provider: "whisper",
        p_units: 1,
      });
      const upstream = calls.at(-1);
      assert.equal(upstream.init.body.get("model"), models.whisper);
      assert.equal(upstream.init.body.get("file").size, 32044);
    },
  );
});
