import { useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useNex } from "../context/NexContext";
import {
  catalogCommand,
  commandGroups,
  filterCommandCatalog,
  type CatalogCommand,
  type CommandGroup,
} from "../lib/nex-command-catalog";

/** A local command library, never an implicit model prompt or a sample mutation. */
export function NexCommandHelp() {
  const nex = useNex();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<CommandGroup | "all">("all");
  const [selected, setSelected] = useState<CatalogCommand | null>(null);
  const [value, setValue] = useState("");
  const commands = filterCommandCatalog(query, group);
  return (
    <div className="nex-command-help">
      <header>
        <span className="eyebrow">Autonomia local</span>
        <h2>O essencial, sem IA.</h2>
        <p>
          Consulte, planeje e prepare ações. Cada comando mostra como funciona.
        </p>
      </header>
      <label className="nex-command-search">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar comandos do N.E.X"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Missões, tempo, projetos…"
        />
      </label>
      <div className="nex-command-filters" aria-label="Categorias de comandos">
        {(
          ["all", ...Object.keys(commandGroups)] as (CommandGroup | "all")[]
        ).map((key) => (
          <button
            key={key}
            type="button"
            className="secondary-button"
            aria-pressed={group === key}
            onClick={() => setGroup(key)}
          >
            {key === "all" ? "Todos" : commandGroups[key]}
          </button>
        ))}
      </div>
      {selected?.parameter && (
        <form
          key={selected.example}
          className="nex-command-editor"
          onSubmit={(e) => {
            e.preventDefault();
            const text = catalogCommand(selected, value);
            if (text && !nex.busy) void nex.send(text);
          }}
        >
          <div>
            <strong>{selected.parameter.prefix}</strong>
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar edição do comando"
              onClick={() => setSelected(null)}
            >
              <X size={16} />
            </button>
          </div>
          <label>
            {selected.parameter.label}
            <input
              autoFocus
              required
              maxLength={selected.parameter.maxLength}
              value={value}
              placeholder={selected.parameter.placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <p>{selected.description}</p>
          <button
            type="submit"
            className="primary-button"
            disabled={nex.busy || !catalogCommand(selected, value)}
          >
            {["organize", "google"].includes(selected.group) &&
            selected.parameter.prefix.toLowerCase() !== "resumo do projeto:"
              ? "Preparar revisão"
              : "Consultar"}
            <ArrowUpRight size={14} />
          </button>
        </form>
      )}
      <p className="nex-command-count" role="status">
        {commands.length} comando(s) neste recorte
      </p>
      <div className="nex-command-list">
        {commands.map((command) => (
          <button
            type="button"
            className="nex-command-card"
            key={command.example}
            disabled={nex.busy}
            onClick={() => {
              if (command.parameter) {
                setSelected(command);
                setValue("");
              } else {
                const text = catalogCommand(command);
                if (text) void nex.send(text);
              }
            }}
          >
            <span>
              <strong>
                {command.parameter
                  ? command.parameter.prefix.replace(/:$/, "")
                  : command.example}
              </strong>
              <small>{command.description}</small>
            </span>
            <span className="surface-chip">
              {command.parameter
                ? "Personalizar"
                : command.group === "google"
                  ? "API Google"
                  : "Local"}
            </span>
          </button>
        ))}
      </div>
      {!commands.length && (
        <p>Nenhum comando encontrado. Tente outra palavra ou categoria.</p>
      )}
      <footer>
        Perguntas livres usam IA apenas quando você ativa essa opção. Voz via
        Groq ainda utiliza cota de transcrição.
      </footer>
    </div>
  );
}
