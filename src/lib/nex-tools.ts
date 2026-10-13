export const nexAreas = {
  geral: { label: "Geral", path: "/nex" },
  agora: { label: "Agora", path: "/" },
  hoje: { label: "Hoje", path: "/hoje" },
  calendario: { label: "Calendário", path: "/calendario" },
  inbox: { label: "Caixa de entrada", path: "/inbox" },
  estudos: { label: "Estudos", path: "/estudos" },
  projetos: { label: "Projetos", path: "/projetos" },
  missoes: { label: "Missões", path: "/missoes" },
  rotinas: { label: "Rotinas", path: "/rotinas" },
  foco: { label: "Foco", path: "/foco" },
  life: { label: "Life", path: "/life-rpg" },
  metas: { label: "Metas", path: "/metas" },
  insights: { label: "Insights", path: "/insights" },
  revisao: { label: "Revisão", path: "/revisao" },
  saude: { label: "Saúde", path: "/saude" },
  financas: { label: "Finanças", path: "/financas" },
  conhecimento: { label: "Conhecimento", path: "/conhecimento" },
  tutorial: { label: "Tutorial", path: "/tutorial" },
  planejamento: { label: "Planejamento", path: "/planejamento" },
  historico: { label: "Histórico", path: "/historico" },
  biblioteca: { label: "Biblioteca", path: "/biblioteca" },
} as const;
export type NexArea = keyof typeof nexAreas;
export const uuidPattern = /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i;
export const operationKinds = {
  "project.create": "Criar projeto",
  "project.edit": "Editar projeto",
  "mission.edit": "Editar missão",
  "mission.complete": "Concluir missão",
  "google.calendar.import": "Importar agenda Google",
  "calendar.create": "Criar compromisso",
  "routine.create": "Criar rotina",
  "study.create": "Criar bloco de estudo",
  "checkin.save": "Salvar check-in de hoje",
  "review.save": "Salvar revisão da semana",
  "finance.create": "Registrar lançamento",
  "memory.save": "Salvar memória",
  "google.calendar.create": "Criar evento Google",
  "google.task.create": "Criar tarefa Google",
  "google.docs.create": "Criar documento vazio",
  "google.sheets.create": "Criar planilha vazia",
  "google.slides.create": "Criar apresentação vazia",
} as const;
export type NexOperation = {
  kind: keyof typeof operationKinds;
  payload: Record<string, string | number | string[]>;
};
export type NexPanel = {
  area: NexArea;
  google?: "calendar" | "tasks" | "drive";
};
export function panels(raw: unknown): NexPanel[] {
  if (!Array.isArray(raw)) return [];
  const found = new Set<string>();
  let googleSeen = false;
  return raw
    .flatMap((x) => {
      const area = x?.area;
      const google = x?.google;
      const googleAreas = {
        calendar: "calendario",
        tasks: "inbox",
        drive: "biblioteca",
      };
      if (
        google !== undefined &&
        (typeof google !== "string" ||
          !Object.hasOwn(googleAreas, google) ||
          googleAreas[google as keyof typeof googleAreas] !== area)
      )
        return [];
      if (google && googleSeen) return [];
      const key = `${google ?? "local"}:${area}`;
      if (
        typeof area !== "string" ||
        !Object.hasOwn(nexAreas, area) ||
        found.has(key)
      )
        return [];
      found.add(key);
      if (google) googleSeen = true;
      return [
        {
          area: area as NexArea,
          ...(google ? { google: google as NexPanel["google"] } : {}),
        },
      ];
    })
    .slice(0, 3);
}
/** One allowlist shared by model proposals, Worker and preview UI. */
export function operation(raw: unknown): NexOperation | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const x = raw as { kind?: unknown; payload?: unknown };
  if (
    typeof x.kind !== "string" ||
    !Object.hasOwn(operationKinds, x.kind) ||
    !x.payload ||
    typeof x.payload !== "object" ||
    Array.isArray(x.payload)
  )
    return null;
  const p = x.payload as Record<string, unknown>,
    out: NexOperation["payload"] = {};
  const str = (k: string, max = 200, required = false) => {
    const v = p[k];
    if (v === undefined && !required) return;
    if (typeof v !== "string" || !v.trim() || v.length > max) throw Error();
    out[k] = v.trim();
  };
  const choice = (k: string, values: string[], fallback?: string) => {
    const v = p[k] ?? fallback;
    if (v === undefined) return;
    if (typeof v !== "string" || !values.includes(v)) throw Error();
    out[k] = v;
  };
  const integer = (k: string, min: number, max: number) => {
    if (
      typeof p[k] !== "number" ||
      !Number.isInteger(p[k]) ||
      Number(p[k]) < min ||
      Number(p[k]) > max
    )
      throw Error();
    out[k] = Number(p[k]);
  };
  const uuid = (k: string, required = false) => {
    if (p[k] === undefined && !required) return;
    if (typeof p[k] !== "string" || !uuidPattern.test(p[k] as string))
      throw Error();
    out[k] = p[k] as string;
  };
  const instant = (k: string) => {
    const v = p[k];
    if (
      typeof v !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) ||
      !Number.isFinite(Date.parse(v))
    )
      throw Error();
    // Keep PostgreSQL microseconds intact for optimistic concurrency.
    out[k] = v;
  };
  try {
    const kind = x.kind as NexOperation["kind"];
    if (
      ![
        "mission.complete",
        "google.calendar.import",
        "checkin.save",
        "review.save",
        "memory.save",
      ].includes(kind)
    )
      str(
        kind.startsWith("project.") || kind === "routine.create"
          ? "name"
          : kind === "study.create"
            ? "subject"
            : "title",
        200,
        true,
      );
    if (kind === "project.create" || kind === "project.edit") {
      str("description", 1000);
      str("next_action", 500);
      choice("status", [
        "Ideia",
        "Ativo",
        "Em espera",
        "Concluído",
        "Arquivado",
      ]);
    }
    if (
      kind === "project.edit" ||
      kind === "mission.edit" ||
      kind === "mission.complete"
    ) {
      uuid("id", true);
      if (p.expected_updated_at !== undefined) instant("expected_updated_at");
    }
    if (kind === "mission.edit") {
      choice("status", [
        "Inbox",
        "A fazer",
        "Em andamento",
        "Bloqueada",
        "Cancelada",
      ]);
      choice("priority", ["Baixa", "Média", "Alta", "Crítica"]);
      uuid("project_id");
    }
    if (kind === "calendar.create" || kind === "google.calendar.create") {
      instant("starts_at");
      instant("ends_at");
      if (Date.parse(String(out.ends_at)) <= Date.parse(String(out.starts_at)))
        throw Error();
      str("note", 1000);
    }
    if (kind === "routine.create") {
      choice(
        "period",
        ["morning", "afternoon", "evening", "anytime"],
        "anytime",
      );
      str("description", 1000);
      if (
        !Array.isArray(p.steps) ||
        p.steps.length < 1 ||
        p.steps.length > 8 ||
        p.steps.some(
          (s) => typeof s !== "string" || !s.trim() || s.length > 160,
        )
      )
        throw Error();
      out.steps = p.steps.map((s) => String(s).trim());
    }
    if (kind === "study.create") {
      integer("weekday", 0, 6);
      for (const k of ["start_time", "end_time"]) {
        if (
          typeof p[k] !== "string" ||
          !/^([01]\d|2[0-3]):[0-5]\d$/.test(p[k] as string)
        )
          throw Error();
        out[k] = p[k] as string;
      }
      if (String(out.end_time) <= String(out.start_time)) throw Error();
      str("note", 1000);
    }
    if (kind === "checkin.save") {
      integer("energy", 1, 10);
      integer("focus", 1, 10);
      str("mood", 80);
      str("note", 1000);
    }
    if (kind === "review.save") {
      str("note", 1000, true);
      str("next_week_focus", 500);
    }
    if (kind === "checkin.save" || kind === "review.save")
      if (p.expected_updated_at !== undefined) instant("expected_updated_at");
    if (kind === "finance.create") {
      choice("kind", ["income", "expense"]);
      if (!out.kind) throw Error();
      choice("status", ["planned", "realized"], "planned");
      str("category", 100);
      const v = p.amount;
      if (
        typeof v !== "number" ||
        !Number.isFinite(v) ||
        v <= 0 ||
        v > 9999999.99 ||
        Math.abs(v * 100 - Math.round(v * 100)) > 0.0000001
      )
        throw Error();
      out.amount = v;
      const d = p.entry_date;
      if (
        typeof d !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
        new Date(d + "T12:00:00Z").toISOString().slice(0, 10) !== d
      )
        throw Error();
      out.entry_date = d;
    }
    if (kind === "memory.save") {
      choice("module", Object.keys(nexAreas), "geral");
      str("content", 1200, true);
    }
    if (kind === "google.task.create") str("note", 1000);
    return { kind, payload: out };
  } catch {
    return null;
  }
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[.!?]+$/, "");
export function localNexCommand(
  value: string,
): { kind: "stop" } | { kind: "navigate"; area: NexArea } | null {
  const text = normalize(value);
  if (
    /^(parar|pare|pausar|silencio|encerrar conversa|parar conversa|pausar conversa)$/.test(
      text,
    )
  )
    return { kind: "stop" };
  const match = text.match(
    /^(?:abra|abrir|abre|ir para|va para) (?:o |a |os |as )?(.+)$/,
  );
  if (!match) return null;
  const aliases: Record<string, NexArea> = {
    inicio: "agora",
    agenda: "calendario",
    tarefas: "missoes",
    nex: "geral",
    "n.e.x": "geral",
    "life rpg": "life",
  };
  const area =
    aliases[match[1]] ??
    Object.entries(nexAreas).find(
      ([, entry]) => normalize(entry.label) === match[1],
    )?.[0];
  return area ? { kind: "navigate", area: area as NexArea } : null;
}
