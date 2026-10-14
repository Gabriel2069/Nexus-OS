import {
  localNexCommand,
  nexAreas,
  type NexArea,
  type NexOperation,
} from "./nex-tools";
import { civilDate, dateKey, shiftDate, APP_TIMEZONE } from "./dates";
import { occurrencesForDay, formatOccurrenceTime } from "./routine-context";
import { nextBestMission } from "./decision-engine";
import type { NexusWorkspace } from "../types/nexus.ts";

export type LocalIntent =
  | { kind: "navigate"; area: NexArea }
  | { kind: "read"; area: NexArea }
  | { kind: "agenda"; offset: number }
  | { kind: "google"; service: "calendar" | "tasks" | "drive" }
  | { kind: "proposal"; target: "mission" | "inbox"; title: string }
  | { kind: "operation"; operation: NexOperation }
  | { kind: "complete"; title: string }
  | {
      kind: "search";
      query: string;
      area?: "missoes" | "projetos" | "rotinas" | "estudos";
    }
  | { kind: "overdue" }
  | { kind: "windows"; visible: boolean }
  | { kind: "help" | "greeting" | "time" | "next" | "stop" };
const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[.!?]+$/, "");
export const localExamples = [
  "O que tenho hoje?",
  "Agenda de amanhã",
  "Qual é meu próximo passo?",
  "Mostre projetos",
  "Agenda Google",
  "Tarefas Google",
  "Arquivos Google",
  "Criar missão: Revisar física",
  "Capturar: Uma ideia",
  "Criar projeto: Novo projeto",
  "Criar tarefa Google: Revisar redação",
  "Buscar: física",
  "Buscar projetos: NexOS",
  "Missões atrasadas",
  "Recolher janelas",
  "Restaurar janelas",
];

/** Exact bounded grammar. Quoted payloads are data, never a second command. */
export function parseLocalIntent(raw: string): LocalIntent | null {
  if (!raw.trim() || raw.length > 1200) return null;
  const value = norm(raw),
    nav = localNexCommand(raw);
  if (nav) return nav;
  if (/^(recolher|minimizar) janelas$/.test(value))
    return { kind: "windows", visible: false };
  if (/^(restaurar|mostrar) janelas$/.test(value))
    return { kind: "windows", visible: true };
  if (/^(missoes atrasadas|o que esta atrasado|prazos vencidos)$/.test(value))
    return { kind: "overdue" };
  const search = raw
    .trim()
    .match(/^buscar(?: (miss[oõ]es|projetos|rotinas|estudos))?\s*:\s*(.+)$/i);
  if (search) {
    const query = search[2].trim();
    if (query.length < 2 || query.length > 100) return null;
    const areas = {
      missoes: "missoes",
      projetos: "projetos",
      rotinas: "rotinas",
      estudos: "estudos",
    } as const;
    const area = search[1]
      ? areas[norm(search[1]) as keyof typeof areas]
      : undefined;
    return { kind: "search", query, ...(area ? { area } : {}) };
  }
  if (
    /^(oi|ola|bom dia|boa tarde|boa noite|obrigado|obrigada|tudo bem)$/.test(
      value,
    )
  )
    return { kind: "greeting" };
  if (
    /^(ajuda|comandos|o que voce faz|o que posso pedir|quero capturar uma ideia)$/.test(
      value,
    )
  )
    return { kind: "help" };
  if (
    /^(que horas sao|qual a hora|hora|data de hoje|que dia e hoje)$/.test(value)
  )
    return { kind: "time" };
  if (
    /^(qual e meu proximo passo|proximo passo|o que fazer agora)$/.test(value)
  )
    return { kind: "next" };
  if (
    /^(agenda( de)?|o que tenho|meu dia|resumo( de)?|planejar|ajude a planejar meu dia)( (para )?(hoje|amanha))?$/.test(
      value,
    )
  )
    return { kind: "agenda", offset: value.includes("amanha") ? 1 : 0 };
  const google = value.match(
    /^(?:mostre |consultar |ver )?(agenda|calendario|tarefas|arquivos|drive)(?: do)? google$/,
  );
  if (google)
    return {
      kind: "google",
      service: /agenda|calendario/.test(google[1])
        ? "calendar"
        : google[1] === "tarefas"
          ? "tasks"
          : "drive",
    };
  const view = value.replace(
    /^(mostre|mostrar|ver|listar|consulte|consultar) (meus? |minhas? |o |a |os |as )?/,
    "",
  );
  const area = Object.entries(nexAreas).find(
    ([, e]) => norm(e.label) === view,
  )?.[0] as NexArea | undefined;
  if (area) return { kind: "read", area };
  const match = raw
    .trim()
    .match(
      /^(criar miss[aã]o|capturar|criar projeto|criar tarefa google|criar documento google|criar planilha google|criar apresenta[cç][aã]o google|concluir miss[aã]o)\s*:\s*(.+)$/i,
    );
  if (!match || match[2].trim().length > 200) return null;
  const verb = norm(match[1]),
    title = match[2].trim();
  if (verb === "criar missao" || verb === "capturar")
    return {
      kind: "proposal",
      target: verb === "capturar" ? "inbox" : "mission",
      title,
    };
  if (verb === "concluir missao") return { kind: "complete", title };
  const kinds = {
    "criar projeto": "project.create",
    "criar tarefa google": "google.task.create",
    "criar documento google": "google.docs.create",
    "criar planilha google": "google.sheets.create",
    "criar apresentacao google": "google.slides.create",
  } as const;
  const kind = kinds[verb as keyof typeof kinds];
  return kind
    ? {
        kind: "operation",
        operation: {
          kind,
          payload: { [kind === "project.create" ? "name" : "title"]: title },
        },
      }
    : null;
}

export function localReadout(area: NexArea, w: NexusWorkspace) {
  const open = w.missions.filter(
    (m) => !["Feita", "Cancelada"].includes(m.status),
  );
  const map: Partial<Record<NexArea, unknown[]>> = {
    missoes: open,
    inbox: open.filter((m) => m.status === "Inbox"),
    projetos: w.projects,
    hoje: w.dailyCheckins.filter((c) => c.checkin_date === dateKey()),
    estudos: w.academicSchedule,
    rotinas: w.routines,
    calendario: w.calendarCommitments,
    foco: w.focusSessions,
    revisao: w.weeklyReviews,
    historico: w.activity,
    life: w.attributes,
    metas: w.projects,
    planejamento: w.projects,
    biblioteca: w.weeklyReviews,
  };
  return map[area]
    ? {
        module: area,
        records: map[area]!.slice(0, 40),
        local: true,
        limited: true,
      }
    : null;
}
export function dayReadout(
  w: NexusWorkspace,
  offset: number,
  now = new Date(),
) {
  const day = shiftDate(civilDate(dateKey(now)), offset),
    key = dateKey(day);
  const events = occurrencesForDay(w.calendarCommitments, day);
  const missions = w.missions.filter(
    (m) =>
      m.due_at &&
      dateKey(new Date(m.due_at)) === key &&
      !["Feita", "Cancelada", "Inbox"].includes(m.status),
  );
  return {
    title: `Agenda · ${key}`,
    reply: `${offset ? "Amanhã" : "Hoje"}, há ${events.length} compromisso(s) e ${missions.length} missão(ões) com prazo nos dados carregados.`,
    data: {
      local: true,
      limited: true,
      sectors: [
        {
          module: "calendario",
          records: events.map((e) => ({
            title: e.title,
            note: formatOccurrenceTime(e),
          })),
        },
        { module: "missoes", records: missions },
      ],
    },
  };
}
export function nextReadout(w: NexusWorkspace) {
  const m = nextBestMission(w.missions, w.checkin);
  return {
    reply: m
      ? `Próximo passo sugerido: ${m.title}. Usei as regras de prioridade, prazo e carga do NexOS, sem IA.`
      : "Nenhuma missão disponível para sugerir nos dados carregados.",
    data: {
      module: "missoes",
      records: m ? [m] : [],
      local: true,
      limited: true,
    },
  };
}
export function localTime(now = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: APP_TIMEZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(now);
}

/** Search only the loaded, owner-scoped workspace. Terms never become instructions. */
export function searchReadout(
  w: NexusWorkspace,
  query: string,
  area?: "missoes" | "projetos" | "rotinas" | "estudos",
) {
  const sources = {
    missoes: w.missions,
    projetos: w.projects,
    rotinas: w.routines,
    estudos: w.academicSchedule,
  };
  const terms = norm(query).split(/\s+/).filter(Boolean);
  let total = 0,
    remaining = 40;
  const sectors = Object.entries(sources)
    .filter(([key]) => !area || key === area)
    .map(([module, records]) => {
      const matches = records.filter((record) => {
        const row = record as unknown as Record<string, unknown>;
        const text = norm(
          [
            "title",
            "name",
            "subject",
            "note",
            "notes",
            "description",
            "next_action",
          ]
            .map((key) => (typeof row[key] === "string" ? row[key] : ""))
            .join(" "),
        );
        return terms.length > 0 && terms.every((term) => text.includes(term));
      });
      total += matches.length;
      const selected = matches.slice(0, remaining);
      remaining -= selected.length;
      return { module, records: selected };
    })
    .filter((sector) => sector.records.length);
  return {
    title: `Busca · ${query}`,
    reply: `Encontrei ${total} resultado(s) nos dados carregados. Mostro até 40, sem usar IA.`,
    data: {
      local: true,
      limited: true,
      summary: `${total} resultado(s) · dados carregados · até 40 exibidos`,
      sectors,
    },
  };
}
export function overdueReadout(w: NexusWorkspace, now = new Date()) {
  const today = dateKey(now);
  const missions = w.missions
    .filter(
      (m) =>
        m.due_at &&
        !["Feita", "Cancelada", "Inbox"].includes(m.status) &&
        Number.isFinite(Date.parse(m.due_at)) &&
        dateKey(new Date(m.due_at)) < today,
    )
    .sort((a, b) => a.due_at!.localeCompare(b.due_at!));
  return {
    title: "Missões atrasadas",
    reply: `Há ${missions.length} missão(ões) com prazo anterior a hoje, em São Paulo, nos dados carregados.`,
    data: {
      module: "missoes",
      records: missions.slice(0, 40),
      local: true,
      limited: true,
    },
  };
}
