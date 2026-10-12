import { CosmicTexture } from "./CosmicEnvironment";
import { ModalSurface } from "./ModalSurface";
import { useOverlay } from "../lib/use-overlay";
import {
  Command,
  Crosshair,
  Focus,
  Inbox,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { navigation } from "../data/navigation";
import { navigate } from "../lib/router";
import { emitUI } from "../lib/ui-events";

export function CommandPalette() {
  const { open, setOpen } = useOverlay("command");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(
    () =>
      navigation.flatMap((group) =>
        group.items.map((item) => ({ ...item, group: group.label })),
      ),
    [],
  );
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = items.filter((item) =>
    normalize(`${item.label} ${item.group}`).includes(normalize(query)),
  );
  function go(path: string) {
    setOpen(false);
    setQuery("");
    navigate(path);
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        open ? setOpen(false) : emitUI("command");
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown" && event.target === inputRef.current) {
        event.preventDefault();
        setSelected((value) =>
          Math.min(value + 1, Math.max(filtered.length - 1, 0)),
        );
        return;
      }
      if (event.key === "ArrowUp" && event.target === inputRef.current) {
        event.preventDefault();
        setSelected((value) => Math.max(value - 1, 0));
        return;
      }
      if (
        event.key === "Enter" &&
        event.target === inputRef.current &&
        filtered[selected]
      ) {
        event.preventDefault();
        go(filtered[selected].path);
        return;
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        const shortcut = event.key.toLowerCase();
        if (shortcut === "n") {
          event.preventDefault();
          setOpen(false);
          emitUI("quickAdd");
        }
        if (shortcut === "h") {
          event.preventDefault();
          go("/hoje");
        }
        if (shortcut === "f") {
          event.preventDefault();
          go("/foco");
        }
        if (shortcut === "i") {
          event.preventDefault();
          go("/inbox");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, query, selected, filtered]);
  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);
  useEffect(() => {
    setSelected(0);
  }, [query, open]);
  useEffect(() => {
    if (open)
      document
        .getElementById(`command-option-${selected}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [selected, open]);
  if (!open) return null;
  return (
    <ModalSurface
      className="overlay nexus-command-overlay"
      label="Central de comandos"
      onClose={() => setOpen(false)}
    >
      <section className="command-palette" data-motion-surface="command">
        <CosmicTexture />
        <div className="command-palette__search" data-motion="command-search">
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar uma área…"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="command-results"
            aria-activedescendant={
              filtered[selected] ? `command-option-${selected}` : undefined
            }
            aria-label="Pesquisar destinos no NexOS"
          />
          <button onClick={() => setOpen(false)} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        {!query && (
          <div className="command-quick" data-motion="quick-actions">
            <button
              onClick={() => {
                setOpen(false);
                emitUI("quickAdd");
              }}
            >
              <Plus size={16} />
              <span>Nova missão</span>
              <kbd>Alt N</kbd>
            </button>
            <button onClick={() => go("/hoje")}>
              <Crosshair size={16} />
              <span>Abrir Hoje</span>
              <kbd>Alt H</kbd>
            </button>
            <button onClick={() => go("/foco")}>
              <Focus size={16} />
              <span>Iniciar foco</span>
              <kbd>Alt F</kbd>
            </button>
            <button onClick={() => go("/inbox")}>
              <Inbox size={16} />
              <span>Caixa de entrada</span>
              <kbd>Alt I</kbd>
            </button>
          </div>
        )}
        <div
          id="command-results"
          className="command-results"
          role="listbox"
          aria-label={query ? "Resultados" : "Navegação"}
          data-motion="results"
        >
          <span className="command-section-label">
            {query ? "Resultados" : "Navegação"}
          </span>
          {filtered.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                id={`command-option-${index}`}
                role="option"
                aria-selected={selected === index}
                className={selected === index ? "is-selected" : ""}
                onMouseEnter={() => setSelected(index)}
                onClick={() => go(item.path)}
                data-motion="result"
              >
                <span className={`nav-item__icon tone-${item.tone}`}>
                  <Icon size={16} />
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.group}</small>
                </div>
                <Command size={12} />
              </button>
            );
          })}
          {!filtered.length && (
            <div className="command-empty">Nenhum destino encontrado.</div>
          )}
        </div>
        <footer className="command-palette__footer">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc fechar</span>
        </footer>
      </section>
    </ModalSurface>
  );
}
