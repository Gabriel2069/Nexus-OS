import { CosmicTexture } from "./CosmicEnvironment";
import { ModalSurface } from "./ModalSurface";
import { useOverlay } from "../lib/use-overlay";
import { AlertCircle, Bell, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { useNexus } from "../context/NexusContext";

export function NotificationCenter() {
  const { open, setOpen } = useOverlay("notifications");
  const { loading, error, notifications } = useNexus();

  if (!open) return null;
  return (
    <ModalSurface
      className="drawer-backdrop nexos-notification-overlay"
      label="Notificações"
      onClose={() => setOpen(false)}
    >
      <aside
        className="notification-drawer"
        onClick={(e) => e.stopPropagation()}
        data-motion-surface="notification"
      >
        <CosmicTexture />
        <header data-motion="drawer-header">
          <div>
            <span className="eyebrow">Central</span>
            <h2>Notificações</h2>
          </div>
          <button
            aria-label="Fechar notificações"
            className="icon-button"
            onClick={() => setOpen(false)}
          >
            <X size={17} />
          </button>
        </header>
        <div className="notification-list" data-motion="notification-list">
          <div className="notification-item">
            <span
              className={`notification-icon ${error ? "tone-amber" : "tone-green"}`}
            >
              {error ? (
                <AlertCircle size={16} />
              ) : loading ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
            </span>
            <div>
              <strong>
                {error
                  ? "Sincronização pendente"
                  : loading
                    ? "Carregando seu espaço"
                    : "Espaço carregado"}
              </strong>
              <p>
                {error ??
                  (loading
                    ? "Aguarde a leitura dos dados."
                    : "Consulte seus próximos passos abaixo.")}
              </p>
            </div>
          </div>
          {notifications.map((item) => (
            <div className="notification-item" key={item.id}>
              <span className="notification-icon tone-blue">
                <Bell size={16} />
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
        <footer>
          <Bell size={14} /> Seus próximos passos, reunidos em um só lugar.
        </footer>
      </aside>
    </ModalSurface>
  );
}
