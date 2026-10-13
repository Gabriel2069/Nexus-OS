export type Env = {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
  NEX_GROQ_FREE_ONLY?: string;
  NEX_GEMINI_FREE_ONLY?: string;
  NEX_WORKERS_FREE_ONLY?: string;
  NEX_TOKEN_ENCRYPTION_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  AI?: {
    run: (model: string, input: Record<string, unknown>) => Promise<unknown>;
  };
};
export class Fault extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
export async function external(url: string, init: RequestInit = {}) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  } catch {
    throw new Fault(
      503,
      "Serviço temporariamente indisponível. Nenhuma ação foi confirmada.",
    );
  }
}
export type Identity = { id: string; token: string };
export async function authenticate(
  request: Request,
  env: Env,
): Promise<Identity> {
  const token = request.headers
    .get("Authorization")
    ?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token || token.length > 8192)
    throw new Fault(401, "Entre no NexOS para usar o N.E.X.");
  const r = await external(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!r.ok) throw new Fault(401, "Sessão expirada. Entre novamente.");
  const user = (await r.json()) as { id?: string; is_anonymous?: boolean };
  if (!user.id || user.is_anonymous)
    throw new Fault(401, "É necessária uma conta autenticada.");
  return { id: user.id, token };
}
export async function db(
  env: Env,
  who: Identity,
  path: string,
  init: RequestInit = {},
) {
  const r = await external(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${who.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!r.ok)
    throw new Fault(
      503,
      "Dados do N.E.X indisponíveis. Verifique a configuração e a migração.",
    );
  return r.status === 204 ? null : r.json();
}
export async function body(request: Request, max = 16000): Promise<unknown> {
  if (!request.body) throw new Fault(400, "Pedido vazio.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Fault(413, "Pedido muito grande.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let off = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, off);
    off += chunk.length;
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error("invalid");
    return value;
  } catch {
    throw new Fault(400, "Pedido inválido.");
  }
}
export function text(value: unknown, max = 1200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Fault(400, "Texto ausente ou acima do limite.");
  return value.trim();
}
export const modules = [
  "geral",
  "agora",
  "hoje",
  "calendario",
  "inbox",
  "estudos",
  "projetos",
  "missoes",
  "rotinas",
  "foco",
] as const;
export function moduleName(value: unknown): string {
  if (
    typeof value !== "string" ||
    !(modules as readonly string[]).includes(value)
  )
    throw new Fault(400, "Módulo inválido.");
  return value;
}
export function originCheck(request: Request) {
  if (
    request.method !== "GET" &&
    request.headers.get("Origin") !== new URL(request.url).origin
  )
    throw new Fault(403, "Origem não autorizada.");
}
const encoder = new TextEncoder();
export function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function unbase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(value.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}
export const nonce = () => base64(crypto.getRandomValues(new Uint8Array(32)));
export async function hash(value: string) {
  return base64(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", encoder.encode(value)),
    ),
  );
}
async function key(env: Env) {
  if (
    !env.NEX_TOKEN_ENCRYPTION_KEY ||
    unbase64(env.NEX_TOKEN_ENCRYPTION_KEY).length !== 32
  )
    throw new Fault(503, "Criptografia do N.E.X não configurada.");
  return crypto.subtle.importKey(
    "raw",
    unbase64(env.NEX_TOKEN_ENCRYPTION_KEY),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(env: Env, value: unknown, aad: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const result = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(aad) },
    await key(env),
    encoder.encode(JSON.stringify(value)),
  );
  return `${base64(iv)}.${base64(new Uint8Array(result))}`;
}
export async function unseal<T>(
  env: Env,
  value: string,
  aad: string,
): Promise<T> {
  try {
    const [iv, cipher] = value.split(".");
    return JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: unbase64(iv),
            additionalData: encoder.encode(aad),
          },
          await key(env),
          unbase64(cipher),
        ),
      ),
    ) as T;
  } catch {
    throw new Fault(400, "Conexão expirada ou inválida. Reconecte.");
  }
}
