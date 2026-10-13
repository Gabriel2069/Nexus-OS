import { AlertCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
export function WorkspaceFeedback({
  error,
  retry,
}: {
  error: string;
  retry: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  async function refresh() {
    if (pending) return;
    setPending(true);
    setRetryError(null);
    try {
      await retry();
    } catch (err) {
      setRetryError(
        err instanceof Error ? err.message : "Não foi possível atualizar.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="workspace-feedback" role="alert">
      <AlertCircle size={22} aria-hidden="true" />
      <div>
        <h2>Não consegui atualizar seu espaço.</h2>
        <p>{retryError ?? error}</p>
        <small>
          Os dados desta área precisam ser atualizados antes de orientar seu
          dia.
        </small>
      </div>
      <button
        className="secondary-button"
        disabled={pending}
        onClick={() => void refresh()}
      >
        <RefreshCw size={16} className={pending ? "spin" : ""} />
        {pending ? "Atualizando…" : "Tentar novamente"}
      </button>
    </section>
  );
}
