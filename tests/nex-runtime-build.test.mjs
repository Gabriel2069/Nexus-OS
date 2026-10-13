import test from "node:test";
import assert from "node:assert/strict";
import { syncRuntimeSecrets } from "../scripts/sync-nex-runtime-secrets.mjs";

const account = "a".repeat(32);
const env = {
  CI: "true",
  WORKERS_CI: "1",
  WORKERS_CI_BRANCH: "main",
  WORKERS_CI_BUILD_UUID: "11111111-1111-4111-8111-111111111111",
  WORKERS_CI_COMMIT_SHA: "a".repeat(40),
  CLOUDFLARE_API_TOKEN: "fake-deploy-token",
  CLOUDFLARE_ACCOUNT_ID: account,
  GROQ_API_KEY: "fake-groq",
  GEMINI_API_KEY: "fake-gemini",
  GOOGLE_CLIENT_ID: "fake-client",
  GOOGLE_CLIENT_SECRET: "fake-client-secret",
  GOOGLE_REDIRECT_URI:
    "https://nexos.gtadeusz.workers.dev/api/integrations/google/callback",
  NEX_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  UNRELATED_SECRET: "must-not-upload",
};
const config = { name: "nexos" };
const ok = (result) => Response.json({ success: true, result });
function mock(bindings = [], domain = "gtadeusz") {
  const calls = [];
  return {
    calls,
    request: async (url, init) => {
      assert.match(url, /^https:\/\/api\.cloudflare\.com\/client\/v4\//);
      assert.equal(init.redirect, "error");
      calls.push({ url, init });
      if (url.endsWith("/accounts?per_page=2")) return ok([{ id: account }]);
      if (url.endsWith("/subdomain")) return ok({ subdomain: domain });
      if (url.endsWith("/settings")) return ok({ bindings });
      assert.equal(init.method, "PATCH");
      return ok({});
    },
  };
}
test("Runtime promotion only runs in genuine main Workers Builds context; no local/PR calls", async () => {
  const request = () => {
    throw Error("must never run");
  };
  for (const override of [
    { WORKERS_CI: undefined },
    { WORKERS_CI_BRANCH: "feature/test" },
  ])
    assert.equal(
      await syncRuntimeSecrets({ ...env, ...override }, request, config),
      "skipped",
    );
  for (const override of [
    { CI: "false" },
    { WORKERS_CI_BUILD_UUID: "" },
    { WORKERS_CI_COMMIT_SHA: "" },
    { CLOUDFLARE_API_TOKEN: "" },
  ])
    await assert.rejects(
      syncRuntimeSecrets({ ...env, ...override }, request, config),
      /^Error: N\.E\.X:/,
    );
  await assert.rejects(
    syncRuntimeSecrets(env, request, { name: "other-worker" }),
  );
});
test("Runtime promotion verifies account and sends one allowlisted secret patch; omitted bindings preserved", async () => {
  const runtimeKey = { name: "NEX_TOKEN_ENCRYPTION_KEY", type: "secret_text" };
  const { request, calls } = mock([
    runtimeKey,
    { name: "UNRELATED_SECRET", type: "secret_text" },
  ]);
  assert.equal(
    await syncRuntimeSecrets(
      { ...env, CLOUDFLARE_ACCOUNT_ID: undefined },
      request,
      config,
    ),
    "synced",
  );
  const patches = calls.filter((c) => c.init.method === "PATCH");
  assert.equal(patches.length, 1);
  assert.equal(
    patches[0].url,
    `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/nexos/secrets-bulk`,
  );
  const { secrets } = JSON.parse(patches[0].init.body);
  assert.deepEqual(Object.keys(secrets).sort(), [
    "GEMINI_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "GROQ_API_KEY",
  ]);
  assert.equal(secrets.GOOGLE_REDIRECT_URI.text, env.GOOGLE_REDIRECT_URI);
  for (const [name, value] of Object.entries(secrets)) {
    assert.equal(value.name, name);
    assert.equal(value.type, "secret_text");
  }
  const complete = mock(
    Object.keys(env)
      .filter((name) =>
        [
          "GROQ_API_KEY",
          "GEMINI_API_KEY",
          "GOOGLE_CLIENT_ID",
          "GOOGLE_CLIENT_SECRET",
          "GOOGLE_REDIRECT_URI",
          "NEX_TOKEN_ENCRYPTION_KEY",
        ].includes(name),
      )
      .map((name) => ({ name, type: "secret_text" })),
  );
  assert.equal(
    await syncRuntimeSecrets(env, complete.request, config),
    "unchanged",
  );
  assert.equal(
    complete.calls.some((c) => c.init.method === "PATCH"),
    false,
  );
});
test("Runtime promotion fails before any write on wrong account, missing secret, invalid encryption/callback", async () => {
  for (const override of [
    { GROQ_API_KEY: "" },
    { NEX_TOKEN_ENCRYPTION_KEY: "bad" },
    { GOOGLE_REDIRECT_URI: "https://evil.example/api/nex/google/callback" },
    { GOOGLE_REDIRECT_URI: "https://nexos.gtadeusz.workers.dev/api/arbitrary" },
  ]) {
    const { request, calls } = mock();
    await assert.rejects(
      syncRuntimeSecrets({ ...env, ...override }, request, config),
    );
    assert.equal(
      calls.some((c) => c.init.method === "PATCH"),
      false,
    );
  }
  const wrong = mock([], "another-account");
  await assert.rejects(syncRuntimeSecrets(env, wrong.request, config));
  assert.equal(
    wrong.calls.some((c) => c.init.method === "PATCH"),
    false,
  );
  const ambiguous = async () => ok([{ id: account }, { id: "b".repeat(32) }]);
  await assert.rejects(
    syncRuntimeSecrets(
      { ...env, CLOUDFLARE_ACCOUNT_ID: undefined },
      ambiguous,
      config,
    ),
  );
});
test("Runtime promotion never includes upstream payloads or tokens in an error and never retries writes", async () => {
  const spy = mock();
  let writes = 0;
  const request = async (url, init) => {
    if (init.method === "PATCH") {
      writes++;
      throw Error(env.GROQ_API_KEY + env.CLOUDFLARE_API_TOKEN);
    }
    return spy.request(url, init);
  };
  await assert.rejects(syncRuntimeSecrets(env, request, config), (error) => {
    assert.equal(error.message.includes(env.GROQ_API_KEY), false);
    assert.equal(error.message.includes(env.CLOUDFLARE_API_TOKEN), false);
    return true;
  });
  assert.equal(writes, 1);
});
