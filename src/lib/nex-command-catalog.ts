import { localExamples, parseLocalIntent } from "./nex-local";
import { normalizeSearch } from "./navigation-state";

export type CommandGroup = "consult" | "organize" | "google";
export const commandGroups: Record<CommandGroup, string> = {
  consult: "Consultar e planejar",
  organize: "Preparar ações",
  google: "Serviços Google",
};
export type CatalogCommand = {
  example: string;
  group: CommandGroup;
  description: string;
  parameter?: {
    prefix: string;
    label: string;
    placeholder: string;
    maxLength: number;
  };
};
const examples = [
  ...localExamples,
  "Projetos sem próxima ação",
  "Bloquear missão: Revisar física",
  "Retomar missão: Revisar física",
  "Concluir missão: Revisar física",
  "Que horas são?",
];
export const commandCatalog: CatalogCommand[] = examples.map((example) => {
  const intent = parseLocalIntent(example);
  const action =
    !!intent &&
    ["proposal", "operation", "missionStatus", "complete"].includes(
      intent.kind,
    );
  const google =
    !!intent &&
    (intent.kind === "google" ||
      (intent.kind === "operation" &&
        intent.operation.kind.startsWith("google.")));
  const colon = example.indexOf(":");
  return {
    example,
    group: google ? "google" : action ? "organize" : "consult",
    description: action
      ? "Prepara uma revisão. A execução exige confirmação."
      : google
        ? "Consulta o serviço autorizado. Não usa modelos."
        : "Usa os dados carregados e as regras locais.",
    ...(colon > -1
      ? {
          parameter: {
            prefix: example.slice(0, colon + 1),
            label:
              intent?.kind === "search"
                ? "Termos da busca"
                : intent?.kind === "project"
                  ? "Nome exato do projeto"
                  : "Título do item",
            placeholder: example.slice(colon + 1).trim(),
            maxLength: intent?.kind === "search" ? 100 : 200,
          },
        }
      : {}),
  };
});
export function filterCommandCatalog(
  query: string,
  group: CommandGroup | "all" = "all",
) {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return commandCatalog.filter(
    (c) =>
      (group === "all" || c.group === group) &&
      terms.every((t) =>
        normalizeSearch(
          `${c.example} ${c.description} ${commandGroups[c.group]}`,
        ).includes(t),
      ),
  );
}
export function catalogCommand(command: CatalogCommand, value = "") {
  const parameter = command.parameter;
  if (parameter && (!value.trim() || value.trim().length > parameter.maxLength))
    return null;
  const text = parameter
    ? `${parameter.prefix} ${value.trim()}`
    : command.example;
  return parseLocalIntent(text) ? text : null;
}
