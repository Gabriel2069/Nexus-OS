import {
  PanelsTopLeft,
  Plus,
  CalendarDays,
  ListTodo,
  Files,
} from "lucide-react";
import { useNex } from "../context/NexContext";
import { nexAreas, type NexArea } from "../lib/nex-tools";
export function NexModuleBridge({ pathname }: { pathname: string }) {
  const nex = useNex();
  const area = Object.entries(nexAreas).find(
    ([, v]) => v.path === pathname,
  )?.[0] as NexArea | undefined;
  if (!area || area === "geral") return null;
  const google = [
    "agora",
    "hoje",
    "calendario",
    "estudos",
    "rotinas",
    "foco",
  ].includes(area)
    ? "calendar"
    : ["missoes", "inbox"].includes(area)
      ? "tasks"
      : ["projetos", "biblioteca", "conhecimento", "planejamento"].includes(
            area,
          )
        ? "drive"
        : null;
  const writable = [
    "calendario",
    "projetos",
    "estudos",
    "rotinas",
    "hoje",
    "revisao",
    "financas",
    "biblioteca",
    "inbox",
  ].includes(area);
  return (
    <nav className="nex-module-bridge" aria-label="Instrumentos conectados">
      <button
        className="text-button"
        disabled={nex.busy}
        onClick={() => void nex.openArea(area)}
      >
        <PanelsTopLeft size={14} />
        Janela · {nexAreas[area].label}
      </button>
      {google && (
        <button
          className="text-button"
          disabled={nex.busy}
          onClick={() =>
            nex.openWindow(`panel:${google}`, `Google · ${google}`, {
              kind: "panel",
              panel: {
                area:
                  google === "calendar"
                    ? "calendario"
                    : google === "tasks"
                      ? "inbox"
                      : "biblioteca",
                google,
              },
            })
          }
        >
          {google === "calendar" ? (
            <CalendarDays size={14} />
          ) : google === "tasks" ? (
            <ListTodo size={14} />
          ) : (
            <Files size={14} />
          )}
          Google ·{" "}
          {google === "calendar"
            ? "Agenda"
            : google === "tasks"
              ? "Tarefas"
              : "Arquivos"}
        </button>
      )}
      {writable && (
        <button
          className="text-button"
          onClick={() =>
            nex.openWindow(
              `compose:${area}`,
              `Criar · ${nexAreas[area].label}`,
              { kind: "compose", area },
            )
          }
        >
          <Plus size={14} />
          Preparar ação
        </button>
      )}
      <span>Sem IA</span>
    </nav>
  );
}
