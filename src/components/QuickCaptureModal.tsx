import { CosmicTexture } from "./CosmicEnvironment";
import { ModalSurface } from "./ModalSurface";
import { useOverlay } from "../lib/use-overlay";
import {
  CalendarDays,
  Inbox,
  ListChecks,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNexus } from "../context/NexusContext";
import { UI_EVENTS } from "../lib/ui-events";
import type { QuickAddDetail } from "../lib/ui-events";

type CaptureType = "mission" | "inbox";

export function QuickCaptureModal() {
  const { addMission, workspace } = useNexus();
  const { open, setOpen } = useOverlay("quickAdd");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CaptureType>("mission");
  const [rank, setRank] = useState<"D" | "C" | "B" | "A" | "S">("C");
  const [dueDate, setDueDate] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writeLock = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const show = (event: Event) => {
      const detail = (event as CustomEvent<QuickAddDetail>).detail;
      setError(null);
      setTitle(detail?.title ?? "");
      setType(detail?.type ?? "mission");
      setDueDate(detail?.dueDate ?? "");
      setProjectId(detail?.projectId ?? "");
    };
    window.addEventListener(UI_EVENTS.quickAdd, show);
    return () => window.removeEventListener(UI_EVENTS.quickAdd, show);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);
  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || writeLock.current) return;
    writeLock.current = true;
    setSaving(true);
    setError(null);
    try {
      const xp = { D: 30, C: 60, B: 120, A: 220, S: 400 }[rank];
      await addMission(title, {
        status: type === "inbox" ? "Inbox" : "A fazer",
        rank,
        xp_base: xp,
        coins_base: Math.round(xp / 6),
        due_at:
          type === "mission" && dueDate ? `${dueDate}T23:59:00-03:00` : null,
        project_id: type === "mission" && projectId ? projectId : null,
      });
      setTitle("");
      setDueDate("");
      setProjectId("");
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar. Sua captura foi preservada.",
      );
    } finally {
      writeLock.current = false;
      setSaving(false);
    }
  }

  return (
    <ModalSurface
      className="overlay"
      label="Captura rápida"
      onClose={() => setOpen(false)}
    >
      <section className="quick-modal">
        <CosmicTexture />
        <div className="modal-title">
          <div>
            <span className="eyebrow">Captura rápida</span>
            <h2>Guarde o próximo passo.</h2>
          </div>
          <button
            aria-label="Fechar captura"
            className="icon-button"
            onClick={() => setOpen(false)}
          >
            <X size={17} />
          </button>
        </div>
        <div className="segmented-control">
          <button
            className={type === "mission" ? "active" : ""}
            aria-pressed={type === "mission"}
            disabled={saving}
            onClick={() => setType("mission")}
          >
            <ListChecks size={15} /> Missão
          </button>
          <button
            className={type === "inbox" ? "active" : ""}
            aria-pressed={type === "inbox"}
            disabled={saving}
            onClick={() => setType("inbox")}
          >
            <Inbox size={15} /> Inbox
          </button>
        </div>
        <form onSubmit={submit} className="quick-form">
          <label htmlFor="capture-title">O que precisa entrar?</label>
          <input
            disabled={saving}
            id="capture-title"
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "mission"
                ? "Ex.: revisar neurologia por 45 min"
                : "Ideia, link, lembrete…"
            }
          />
          {type === "mission" && (
            <>
              <label htmlFor="capture-date" className="quick-date-label">
                <CalendarDays size={14} /> Data <span>opcional</span>
              </label>
              <div className="quick-date-control">
                <input
                  id="capture-date"
                  disabled={saving}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <label htmlFor="capture-project" className="quick-project-label">
                Projeto <span>opcional</span>
              </label>
              <select
                disabled={saving}
                id="capture-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Sem projeto</option>
                {workspace.projects
                  .filter(
                    (project) =>
                      !["Concluído", "Arquivado"].includes(project.status),
                  )
                  .map((project) => (
                    <option value={project.id} key={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
              <div className="rank-picker">
                <span>Rank</span>
                {(["D", "C", "B", "A", "S"] as const).map((item) => (
                  <button
                    type="button"
                    disabled={saving}
                    key={item}
                    className={rank === item ? "active" : ""}
                    aria-pressed={rank === item}
                    onClick={() => setRank(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}
          {error && (
            <p role="alert" className="auth-message auth-message--error">
              {error}
            </p>
          )}
          <button
            className="primary-button modal-submit"
            disabled={saving || !title.trim()}
          >
            {saving ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            {saving
              ? "Salvando…"
              : type === "mission"
                ? "Criar missão"
                : "Capturar"}
          </button>
        </form>
      </section>
    </ModalSurface>
  );
}
