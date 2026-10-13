import type { NexOperation } from "../../src/lib/nex-tools.ts";
import {
  authenticate,
  body,
  db,
  external,
  Fault,
  hash,
  json,
  nonce,
  seal,
  text,
  unseal,
  type Env,
  type Identity,
} from "./core.ts";
import { reserve } from "./providers.ts";
import { isGoogleCallback } from "./google-callback.ts";
export const scopes = {
  workspace:
    "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/drive.file",
  calendar_write: "https://www.googleapis.com/auth/calendar.events",
  tasks_write: "https://www.googleapis.com/auth/tasks",
  calendar: "https://www.googleapis.com/auth/calendar.events.readonly",
  tasks: "https://www.googleapis.com/auth/tasks.readonly",
  drive: "https://www.googleapis.com/auth/drive.file",
  docs: "https://www.googleapis.com/auth/drive.file",
  sheets: "https://www.googleapis.com/auth/drive.file",
  slides: "https://www.googleapis.com/auth/drive.file",
};
type Service = keyof typeof scopes;
type Tokens = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope: string;
};
type Flow = {
  state: string;
  verifier: string;
  token: string;
  expires: number;
  origin: string;
};
const cookieName = "__Host-nex-google";
const cookie = (value: string, age = 600) =>
  `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
function configuration(env: Env, origin: string) {
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REDIRECT_URI ||
    !env.NEX_TOKEN_ENCRYPTION_KEY
  )
    throw new Fault(503, "Google ainda não configurado no Worker.");
  const redirect = new URL(env.GOOGLE_REDIRECT_URI);
  if (
    redirect.origin !== origin ||
    redirect.protocol !== "https:" ||
    !isGoogleCallback(redirect.pathname) ||
    redirect.username ||
    redirect.password ||
    redirect.search ||
    redirect.hash
  )
    throw new Fault(
      503,
      "Callback Google deve corresponder ao domínio e a uma rota Google autorizada do NexOS.",
    );
}
export async function start(request: Request, env: Env, who: Identity) {
  const origin = new URL(request.url).origin;
  configuration(env, origin);
  const input = (await body(request)) as { service?: unknown };
  const service = text(input.service, 20) as Service;
  if (!Object.hasOwn(scopes, service))
    throw new Fault(400, "Serviço inválido.");
  await reserve(env, who, "google", 1);
  const state = nonce(),
    verifier = nonce();
  const expires = Date.now() + 600000;
  await db(env, who, `nex_oauth_states?user_id=eq.${who.id}`, {
    method: "DELETE",
  });
  await db(env, who, "nex_oauth_states", {
    method: "POST",
    body: JSON.stringify({
      user_id: who.id,
      state_hash: await hash(state),
      expires_at: new Date(expires).toISOString(),
    }),
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: scopes[service],
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent select_account",
    state,
    code_challenge: await hash(verifier),
    code_challenge_method: "S256",
  }).toString();
  const protectedFlow = await seal(
    env,
    { state, verifier, token: who.token, expires, origin },
    "oauth-flow",
  );
  if (protectedFlow.length > 3500)
    throw new Fault(
      400,
      "Sessão grande demais para conectar com segurança. Revise os metadados da conta.",
    );
  return json({ url: url.toString() }, 200, {
    "Set-Cookie": cookie(protectedFlow),
  });
}
export async function callback(request: Request, env: Env) {
  const url = new URL(request.url);
  configuration(env, url.origin);
  if (url.pathname !== new URL(env.GOOGLE_REDIRECT_URI!).pathname)
    throw new Fault(400, "Callback diferente do endereço configurado.");
  const value = request.headers
    .get("Cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(cookieName + "="))
    ?.slice(cookieName.length + 1);
  if (!value) throw new Fault(400, "Abra a conexão Google a partir do N.E.X.");
  const flow = await unseal<Flow>(env, value, "oauth-flow");
  if (
    flow.expires < Date.now() ||
    flow.origin !== url.origin ||
    url.searchParams.get("state") !== flow.state
  )
    throw new Fault(400, "Conexão expirada ou state inválido.");
  const who = await authenticate(
    new Request(request.url, {
      headers: { Authorization: `Bearer ${flow.token}` },
    }),
    env,
  );
  const rows = (await db(
    env,
    who,
    `nex_oauth_states?user_id=eq.${who.id}&state_hash=eq.${await hash(flow.state)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`,
    { method: "DELETE", headers: { Prefer: "return=representation" } },
  )) as unknown[];
  if (rows.length !== 1)
    throw new Fault(400, "Conexão já utilizada ou expirada.");
  if (url.searchParams.has("error"))
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/nex?google=denied",
        "Set-Cookie": cookie("", 0),
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  const code = text(url.searchParams.get("code"), 4096);
  await reserve(env, who, "google", 1);
  const r = await external("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_REDIRECT_URI!,
      code,
      code_verifier: flow.verifier,
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok)
    throw new Fault(503, "Google recusou a conexão. Reconecte pelo N.E.X.");
  const data = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!data.access_token || !data.scope || !data.expires_in)
    throw new Fault(503, "Google não retornou uma autorização válida.");
  const tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    scope: data.scope,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  await save(env, who, tokens);
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/nex?google=connected",
      "Set-Cookie": cookie("", 0),
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
async function save(env: Env, who: Identity, tokens: Tokens) {
  await db(env, who, "nex_google_connections?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      user_id: who.id,
      ciphertext: await seal(env, tokens, who.id),
      scopes: tokens.scope.split(" "),
      updated_at: new Date().toISOString(),
    }),
  });
}
async function load(env: Env, who: Identity): Promise<Tokens> {
  const rows = (await db(
    env,
    who,
    `nex_google_connections?user_id=eq.${who.id}&select=ciphertext`,
  )) as { ciphertext: string }[];
  if (!rows[0]) throw new Fault(409, "Conecte sua conta Google primeiro.");
  let tokens = await unseal<Tokens>(env, rows[0].ciphertext, who.id);
  if (tokens.expires_at < Date.now() + 60000) {
    if (!tokens.refresh_token)
      throw new Fault(409, "Reconecte o Google para renovar a autorização.");
    await reserve(env, who, "google", 1);
    const r = await external("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (!r.ok)
      throw new Fault(
        409,
        "Autorização Google expirada ou revogada. Reconecte.",
      );
    const data = (await r.json()) as {
      access_token: string;
      expires_in: number;
    };
    if (!data.access_token || !Number.isFinite(data.expires_in))
      throw new Fault(503, "Renovação Google inválida.");
    tokens = {
      ...tokens,
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    await save(env, who, tokens);
  }
  return tokens;
}
export async function disconnect(env: Env, who: Identity) {
  const rows = (await db(
    env,
    who,
    `nex_google_connections?user_id=eq.${who.id}&select=ciphertext`,
  )) as { ciphertext: string }[];
  let revoked = false;
  if (rows[0]) {
    const tokens = await unseal<Tokens>(env, rows[0].ciphertext, who.id);
    try {
      const r = await external("https://oauth2.googleapis.com/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          token: tokens.refresh_token ?? tokens.access_token,
        }),
      });
      revoked = r.ok;
    } catch {
      /* Local deletion still proceeds. */
    }
  }
  await db(env, who, `nex_google_connections?user_id=eq.${who.id}`, {
    method: "DELETE",
  });
  await db(env, who, `nex_oauth_states?user_id=eq.${who.id}`, {
    method: "DELETE",
  });
  return json({ disconnected: true, revoked });
}
export async function readGoogle(request: Request, env: Env, who: Identity) {
  return json(
    await readGoogleData(
      env,
      who,
      (await body(request)) as {
        service?: unknown;
        id?: unknown;
        range?: unknown;
      },
    ),
  );
}
export async function readGoogleData(
  env: Env,
  who: Identity,
  input: { service?: unknown; id?: unknown; range?: unknown },
) {
  const service = text(input.service, 20) as Service;
  if (
    !["calendar", "tasks", "drive", "docs", "sheets", "slides"].includes(
      service,
    )
  )
    throw new Fault(400, "Serviço de consulta inválido.");
  const tokens = await load(env, who);
  if (
    !tokens.scope.split(" ").includes(scopes[service]) &&
    !(
      service === "calendar" &&
      tokens.scope.split(" ").includes(scopes.calendar_write)
    ) &&
    !(
      service === "tasks" &&
      tokens.scope.split(" ").includes(scopes.tasks_write)
    )
  )
    throw new Fault(409, "Autorize este serviço no N.E.X.");
  const id = typeof input.id === "string" ? input.id : "";
  if (id && !/^[\w-]{1,200}$/.test(id))
    throw new Fault(400, "Identificador inválido.");
  let url = "";
  switch (service) {
    case "calendar":
      url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=20&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(new Date().toISOString())}`;
      break;
    case "tasks":
      url =
        "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks?maxResults=20&showCompleted=false";
      break;
    case "drive":
      url =
        "https://www.googleapis.com/drive/v3/files?q=trashed%3Dfalse&pageSize=20&fields=files(id,name,mimeType,webViewLink)";
      break;
    case "docs":
      if (!id)
        throw new Fault(400, "Informe o ID de um documento autorizado ao app.");
      url = `https://docs.googleapis.com/v1/documents/${id}`;
      break;
    case "sheets":
      if (!id)
        throw new Fault(400, "Informe o ID de uma planilha autorizada ao app.");
      if (input.range) {
        if (
          typeof input.range !== "string" ||
          input.range.length > 100 ||
          !/^([\w \-]+!)?[A-Z]{1,3}\d{1,6}(:[A-Z]{1,3}\d{1,6})?$/.test(
            input.range,
          )
        )
          throw new Fault(400, "Intervalo A1 inválido.");
        url =
          "https://sheets.googleapis.com/v4/spreadsheets/" +
          id +
          "/values/" +
          encodeURIComponent(input.range);
      } else
        url =
          "https://sheets.googleapis.com/v4/spreadsheets/" +
          id +
          "?fields=spreadsheetId,properties,sheets.properties";
      break;
    case "slides":
      if (!id)
        throw new Fault(
          400,
          "Informe o ID de uma apresentação autorizada ao app.",
        );
      url = `https://slides.googleapis.com/v1/presentations/${id}?fields=presentationId,title,slides(objectId,pageElements(shape(text(textElements(textRun(content))))))`;
      break;
  }
  await reserve(env, who, "google", 1);
  const r = await external(url, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!r.ok)
    throw new Fault(
      r.status === 401 ? 409 : 503,
      "Consulta Google recusada. Confira permissões, arquivo autorizado e conexão.",
    );
  return { service, data: await r.json(), limited: true };
}

export async function createGoogle(
  env: Env,
  who: Identity,
  id: string,
  op: NexOperation,
) {
  const tokens = await load(env, who);
  const service =
    op.kind === "google.calendar.create"
      ? "calendar_write"
      : op.kind === "google.task.create"
        ? "tasks_write"
        : op.kind === "google.docs.create"
          ? "docs"
          : op.kind === "google.sheets.create"
            ? "sheets"
            : op.kind === "google.slides.create"
              ? "slides"
              : null;
  if (!service) throw new Fault(400, "Ferramenta Google inválida.");
  if (!tokens.scope.split(" ").includes(scopes[service]))
    throw new Fault(409, "Autorize a escrita deste serviço primeiro.");
  // An uncertain write is never retried automatically.
  const history = (await db(env, who, "rpc/nex_operation_history", {
    method: "POST",
    body: "{}",
  })) as { id: string; state: string }[];
  if (history.some((x) => x.id === id && x.state === "pending"))
    throw new Fault(
      409,
      "Resultado pendente. Confira no Google antes de tentar outra operação.",
    );
  await reserve(env, who, "google", 1);
  const claim = (await db(env, who, "rpc/nex_claim_operation", {
    method: "POST",
    body: JSON.stringify({ p_id: id, p_kind: op.kind, p_payload: op.payload }),
  })) as { claimed?: boolean };
  if (!claim.claimed) return claim;
  const p = op.payload;
  let url: string, payload: unknown;
  if (service === "calendar_write") {
    url =
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none";
    payload = {
      id: id.replaceAll("-", ""),
      summary: p.title,
      description: p.note,
      start: { dateTime: p.starts_at, timeZone: "America/Sao_Paulo" },
      end: { dateTime: p.ends_at, timeZone: "America/Sao_Paulo" },
    };
  } else if (service === "tasks_write") {
    url = "https://tasks.googleapis.com/tasks/v1/lists/@default/tasks";
    payload = { title: p.title, notes: p.note };
  } else if (service === "docs") {
    url = "https://docs.googleapis.com/v1/documents";
    payload = { title: p.title };
  } else if (service === "sheets") {
    url = "https://sheets.googleapis.com/v4/spreadsheets";
    payload = { properties: { title: p.title } };
  } else {
    url = "https://slides.googleapis.com/v1/presentations";
    payload = { title: p.title };
  }
  try {
    const r = await external(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + tokens.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw Error();
    const data = (await r.json()) as {
      id?: string;
      documentId?: string;
      spreadsheetId?: string;
      presentationId?: string;
    };
    const created =
      data.id ?? data.documentId ?? data.spreadsheetId ?? data.presentationId;
    if (!created || !/^[\w-]{1,200}$/.test(created)) throw Error();
    const href =
      service === "calendar_write"
        ? "https://calendar.google.com/calendar/u/0/r"
        : service === "tasks_write"
          ? "https://tasks.google.com/"
          : service === "docs"
            ? "https://docs.google.com/document/d/" + created + "/edit"
            : service === "sheets"
              ? "https://docs.google.com/spreadsheets/d/" + created + "/edit"
              : "https://docs.google.com/presentation/d/" + created + "/edit";
    return await db(env, who, "rpc/nex_finish_operation", {
      method: "POST",
      body: JSON.stringify({
        p_id: id,
        p_receipt: {
          applied: true,
          id: created,
          kind: op.kind,
          area: "geral",
          href,
        },
      }),
    });
  } catch {
    throw new Fault(
      409,
      "Resultado Google não confirmado. Confira o destino; a operação ficou pendente e não será repetida automaticamente.",
    );
  }
}
export async function importCalendar(env: Env, who: Identity, id: string) {
  const result = await readGoogleData(env, who, { service: "calendar" });
  const data = result.data as {
    items?: {
      id?: string;
      summary?: string;
      start?: { date?: string; dateTime?: string };
      end?: { date?: string; dateTime?: string };
    }[];
  };
  const events = (data.items ?? []).slice(0, 20).flatMap((e) => {
    const starts =
      e.start?.dateTime ??
      (e.start?.date ? e.start.date + "T00:00:00-03:00" : "");
    const ends =
      e.end?.dateTime ?? (e.end?.date ? e.end.date + "T00:00:00-03:00" : "");
    if (
      !e.id ||
      e.id.length > 230 ||
      !Number.isFinite(Date.parse(starts)) ||
      !(Date.parse(ends) > Date.parse(starts))
    )
      return [];
    return [
      {
        external_id: "google:" + e.id,
        title: (e.summary ?? "Compromisso Google").slice(0, 200),
        starts_at: starts,
        ends_at: ends,
      },
    ];
  });
  return db(env, who, "rpc/nex_apply_operation", {
    method: "POST",
    body: JSON.stringify({
      p_id: id,
      p_kind: "google.calendar.import",
      p_payload: { events },
    }),
  });
}
