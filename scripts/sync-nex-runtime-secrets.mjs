import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const names = [
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "NEX_TOKEN_ENCRYPTION_KEY",
];
const api = "https://api.cloudflare.com/client/v4";

// The user's existing Workers Builds stores these in Build, not Runtime.
// Populate missing bindings only: never rotate encryption or overwrite runtime.
export async function syncRuntimeSecrets(env, request = fetch, config = {}) {
  if (env.WORKERS_CI !== "1" || env.WORKERS_CI_BRANCH !== "main")
    return "skipped";
  if (
    env.CI !== "true" ||
    !/^[a-f0-9-]{36}$/i.test(env.WORKERS_CI_BUILD_UUID ?? "") ||
    !/^[a-f0-9]{40}$/i.test(env.WORKERS_CI_COMMIT_SHA ?? "") ||
    config.name !== "nexos"
  )
    throw new Error("N.E.X: contexto de publicação de produção inválido.");
  if (!env.CLOUDFLARE_API_TOKEN)
    throw new Error(
      "N.E.X: credencial do deploy ausente no ambiente Workers Builds.",
    );

  async function call(path, init = {}) {
    try {
      const response = await request(api + path, {
        ...init,
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/merge-patch+json",
        },
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      });
      // Upstream bodies can contain credentials; never print or propagate them.
      if (!response.ok) throw new Error();
      const payload = await response.json();
      if (payload.success !== true) throw new Error();
      return payload.result;
    } catch {
      throw new Error(
        "N.E.X: Cloudflare recusou a sincronização segura; nenhuma resposta sensível foi registrada.",
      );
    }
  }

  let account = env.CLOUDFLARE_ACCOUNT_ID;
  if (!account) {
    const accounts = await call("/accounts?per_page=2");
    if (!Array.isArray(accounts) || accounts.length !== 1)
      throw new Error(
        "N.E.X: conta Cloudflare ambígua; sincronização interrompida.",
      );
    account = accounts[0]?.id;
  }
  if (!/^[a-f0-9]{32}$/i.test(account ?? ""))
    throw new Error("N.E.X: identificador de conta Cloudflare inválido.");
  const base = `/accounts/${account}/workers`;
  const domain = await call(`${base}/subdomain`);
  if (domain?.subdomain !== "gtadeusz")
    throw new Error(
      "N.E.X: conta não corresponde a nexos.gtadeusz.workers.dev.",
    );
  const settings = await call(`${base}/scripts/nexos/settings`);
  if (!Array.isArray(settings?.bindings))
    throw new Error(
      "N.E.X: não foi possível verificar os bindings existentes.",
    );
  const existing = new Map(
    settings.bindings.map((item) => [item.name, item.type]),
  );
  const secrets = {};
  for (const name of names) {
    if (
      existing.get(name) === "secret_text" ||
      (name === "GOOGLE_REDIRECT_URI" && existing.get(name) === "plain_text")
    )
      continue;
    if (existing.has(name))
      throw new Error(
        `N.E.X: ${name} já existe com outro tipo; preservado sem alteração.`,
      );
    const value = env[name];
    if (typeof value !== "string" || !value.trim())
      throw new Error(
        `N.E.X: ${name} ausente no Build; nenhuma chave foi alterada.`,
      );
    if (
      name === "NEX_TOKEN_ENCRYPTION_KEY" &&
      (!/^[A-Za-z0-9+/_-]{43}=?$/.test(value) ||
        Buffer.from(value, "base64").length !== 32)
    )
      throw new Error(
        "N.E.X: chave de criptografia deve conter 32 bytes em base64; não foi substituída.",
      );
    if (name === "GOOGLE_REDIRECT_URI") {
      let redirect;
      try {
        redirect = new URL(value);
      } catch {
        throw new Error("N.E.X: callback Google inválido.");
      }
      if (
        redirect.origin !== "https://nexos.gtadeusz.workers.dev" ||
        ![
          "/api/nex/google/callback",
          "/api/integrations/google/callback",
        ].includes(redirect.pathname) ||
        redirect.search ||
        redirect.hash ||
        redirect.username ||
        redirect.password
      )
        throw new Error(
          "N.E.X: callback Google não corresponde às rotas seguras do NexOS.",
        );
    }
    secrets[name] = { name, type: "secret_text", text: value };
  }
  if (!Object.keys(secrets).length) return "unchanged";
  // A single merge patch preserves every binding omitted from this allowlist.
  // No temp files, command arguments, telemetry or raw upstream logs.
  await call(`${base}/scripts/nexos/secrets-bulk`, {
    method: "PATCH",
    body: JSON.stringify({ secrets }),
  });
  return "synced";
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const production =
      process.env.WORKERS_CI === "1" &&
      process.env.WORKERS_CI_BRANCH === "main";
    const config = production
      ? JSON.parse(readFileSync("dist/nexos/wrangler.json", "utf8"))
      : {};
    const status = await syncRuntimeSecrets(process.env, fetch, config);
    console.log(`N.E.X runtime bindings: ${status}.`);
  } catch (error) {
    // Only errors created by this module are safe; no raw parse/filesystem error.
    console.error(
      error instanceof Error && error.message.startsWith("N.E.X:")
        ? error.message
        : "N.E.X: sincronização segura interrompida.",
    );
    process.exitCode = 1;
  }
}
