import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  X,
  Plus,
  Pin,
  Clock3,
  ArrowUpRight,
  ListChecks,
  BriefcaseBusiness,
  Focus,
  Inbox,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CosmicTexture } from "./CosmicEnvironment";
import { ModalSurface } from "./ModalSurface";
import { useOverlay } from "../lib/use-overlay";
import { destinations, useNavigation } from "../context/NavigationContext";
import { useNexus } from "../context/NexusContext";
import { entityPath, normalizeSearch } from "../lib/navigation-state";
import { navigation } from "../data/navigation";
import { navigate } from "../lib/router";
import { emitUI, UI_EVENTS } from "../lib/ui-events";
type Result = {
  id: string;
  label: string;
  detail: string;
  path: string;
  icon: LucideIcon;
  tone: string;
  terms: string;
};
export function CommandPalette() {
  const { open, setOpen } = useOverlay("command");
  const { pinned, recent, togglePin, message, clearRecent } = useNavigation();
  const { workspace, loading, error } = useNexus();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Todas");
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const results = useMemo(() => {
    const pages: Result[] = destinations
      .filter((d) => group === "Todas" || d.group === group)
      .map((d) => ({
        id: d.path,
        label: d.label,
        detail: pinned.includes(d.path) ? "Área fixada" : d.group,
        path: d.path,
        icon: d.icon,
        tone: d.tone,
        terms: `${d.label} ${d.group}`,
      }));
    if (!query.trim())
      return pages.sort(
        (a, b) =>
          Number(pinned.includes(b.path)) - Number(pinned.includes(a.path)),
      );
    const entities: Result[] =
      loading || error
        ? []
        : [
            ...workspace.missions.map((m) => ({
              id: `mission-${m.id}`,
              label: m.title,
              detail: `Missão · ${m.status}`,
              path: entityPath("mission", m.id),
              icon: ListChecks,
              tone: "rose",
              terms: `${m.title} ${m.notes ?? ""} missão tarefa`,
            })),
            ...workspace.projects.map((p) => ({
              id: `project-${p.id}`,
              label: p.name,
              detail: `Projeto · ${p.status}`,
              path: entityPath("project", p.id),
              icon: BriefcaseBusiness,
              tone: "violet",
              terms: `${p.name} ${p.next_action ?? ""} ${p.description ?? ""} projeto`,
            })),
          ];
    const words = normalizeSearch(query).split(/\s+/);
    return [...pages, ...(group === "Todas" ? entities : [])]
      .filter((item) =>
        words.every((w) => normalizeSearch(item.terms).includes(w)),
      )
      .slice(0, 40);
  }, [
    query,
    group,
    pinned,
    workspace.missions,
    workspace.projects,
    loading,
    error,
  ]);
  const active = Math.min(selected, Math.max(0, results.length - 1));
  function close() {
    setOpen(false);
  }
  function go(path: string) {
    close();
    navigate(path);
    if (path.startsWith("/missoes?"))
      emitUI("inspect", {
        kind: "mission",
        id: new URLSearchParams(path.split("?")[1]).get("mission"),
      });
    if (path.startsWith("/projetos?"))
      emitUI("inspect", {
        kind: "project",
        id: new URLSearchParams(path.split("?")[1]).get("project"),
      });
  }
  useEffect(() => {
    const legacy = () => emitUI("command");
    window.addEventListener(UI_EVENTS.navigation, legacy);
    return () => window.removeEventListener(UI_EVENTS.navigation, legacy);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open ? close() : emitUI("command");
      }
      if (!open || e.target !== input.current) return;
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
        e.preventDefault();
        setSelected((n) =>
          e.key === "Home"
            ? 0
            : e.key === "End"
              ? Math.max(0, results.length - 1)
              : Math.max(
                  0,
                  Math.min(
                    results.length - 1,
                    n + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                ),
        );
      }
      if (e.key === "Enter" && results[active]) {
        e.preventDefault();
        go(results[active].path);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, results, active]);
  useEffect(() => {
    if (open) {
      setQuery("");
      setGroup("Todas");
      setSelected(0);
    }
  }, [open]);
  useEffect(() => {
    setSelected(0);
  }, [query, group]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`navigator-option-${active}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);
  if (!open) return null;
  return (
    <ModalSurface
      className="overlay nexus-command-overlay"
      initialFocus={input}
      label="Explorar NexOS"
      onClose={close}
    >
      <section className="command-palette navigator">
        <CosmicTexture />
        <header className="navigator-heading">
          <div>
            <span className="eyebrow">Central de navegação</span>
            <h2>Seu universo, conectado.</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Fechar navegação"
            onClick={close}
          >
            <X size={18} />
          </button>
        </header>
        <div className="command-palette__search">
          <Search size={20} />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Área, missão ou projeto…"
            aria-label="Pesquisar no NexOS"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-autocomplete="list"
            aria-activedescendant={
              results[active] ? `navigator-option-${active}` : undefined
            }
          />
        </div>
        <div className="navigator-actions">
          <button
            onClick={() => {
              close();
              emitUI("quickAdd");
            }}
          >
            <Plus size={17} />
            Capturar
          </button>
          <button onClick={() => go("/foco")}>
            <Focus size={17} />
            Foco
          </button>
          <button onClick={() => go("/inbox")}>
            <Inbox size={17} />
            Organizar entradas
          </button>
        </div>
        {!query && recent.length > 0 && (
          <section className="navigator-recents" aria-label="Áreas recentes">
            <div>
              <span>
                <Clock3 size={14} />
                Recentes
              </span>
              <button className="text-button" onClick={clearRecent}>
                Limpar
              </button>
            </div>
            <nav>
              {recent.map((path) => {
                const d = destinations.find((d) => d.path === path)!;
                return (
                  <button key={path} onClick={() => go(path)}>
                    {d.label}
                    <ArrowUpRight size={13} />
                  </button>
                );
              })}
            </nav>
          </section>
        )}
        <nav className="navigator-groups" aria-label="Filtrar áreas">
          {["Todas", ...navigation.map((g) => g.label)].map((label) => (
            <button
              key={label}
              aria-pressed={group === label}
              className={group === label ? "active" : ""}
              onClick={() => setGroup(label)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="navigator-results-label">
          <span>
            {query ? "Resultados nos dados carregados" : "Áreas do seu espaço"}
          </span>
          <span>
            {results.length}
            {query && results.length === 40 ? " primeiros" : ""}
          </span>
        </div>
        <div
          className="command-results"
          id="command-results"
          role="listbox"
          aria-label="Resultados da navegação"
        >
          {results.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`navigator-option-${index}`}
                role="option"
                aria-selected={active === index}
                className={active === index ? "is-selected" : ""}
                onMouseEnter={() => setSelected(index)}
                onClick={() => go(item.path)}
              >
                <span className={`nav-item__icon tone-${item.tone}`}>
                  <Icon size={19} />
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </div>
                {pinned.includes(item.path) ? (
                  <Pin size={14} />
                ) : (
                  <ArrowUpRight size={14} />
                )}
              </button>
            );
          })}
          {!results.length && (
            <p className="command-empty">
              Nenhum resultado. Tente outro nome ou outra área.
            </p>
          )}
        </div>
        {(loading || error) && query && (
          <p className="navigator-note">
            {loading
              ? "Seus itens ainda estão carregando. Áreas continuam disponíveis."
              : "Não foi possível consultar seus itens. A busca mostra apenas áreas."}
          </p>
        )}
        {!query && (
          <details className="navigator-preferences">
            <summary>
              <Pin size={15} />
              Personalizar atalhos<span>{pinned.length}/6</span>
            </summary>
            <p>Fixe até seis áreas para abrir de qualquer tela.</p>
            <div>
              {destinations
                .filter((d) => d.path !== "/")
                .map((d) => (
                  <label key={d.path}>
                    <input
                      type="checkbox"
                      checked={pinned.includes(d.path)}
                      disabled={!pinned.includes(d.path) && pinned.length >= 6}
                      onChange={() => togglePin(d.path)}
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
            </div>
            <p role="status">{message}</p>
          </details>
        )}
        <footer className="command-palette__footer">
          <span>↑↓ escolher · Enter abrir</span>
          <span>Esc fechar</span>
        </footer>
      </section>
    </ModalSurface>
  );
}
