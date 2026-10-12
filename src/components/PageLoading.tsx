import { LoaderCircle } from "lucide-react";
export function PageLoading() {
  return (
    <section className="workspace-loading" role="status" aria-live="polite">
      <LoaderCircle className="spin" size={24} aria-hidden="true" />
      <h2>Abrindo sua área</h2>
      <p>Preparando o próximo espaço.</p>
      <div className="workspace-loading__lines" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </section>
  );
}
