import {
  Brain,
  Bell,
  Command,
  Download,
  Settings2,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceRail } from "./WorkspaceRail";
import { ModalSurface } from "./ModalSurface";
import { useOverlay } from "../lib/use-overlay";
import { useNexus } from "../context/NexusContext";
import { isCurrentDestination, navigation } from "../data/navigation";
import { AppearanceControls } from "./AppearanceControls";
import { emitUI } from "../lib/ui-events";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type TopbarProps = { pathname: string };

export function Topbar({ pathname }: TopbarProps) {
  const { workspace, notifications } = useNexus();
  const preferences = useOverlay("shellPreferences");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const route = useMemo(() => {
    for (const group of navigation) {
      const item = group.items.find((candidate) =>
        isCurrentDestination(candidate.path, pathname),
      );
      if (item) return { group: group.label, label: item.label };
    }
    return { group: "NexOS", label: "Sistema" };
  }, [pathname]);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }
  const name = workspace.profile?.display_name || "Seu espaço";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const avatarUrl = workspace.profile?.avatar_url;
  return (
    <header className="topbar" data-motion-shell="topbar">
      <div className="topbar__context">
        <div
          className="topbar__route"
          aria-label="Local atual"
          data-motion="route-context"
        >
          <small>{route.group}</small>
          <strong key={route.label} className="route-label-enter">
            {route.label}
          </strong>
        </div>
        <button
          className="command-search"
          onClick={() => emitUI("command")}
          aria-label="Explorar áreas e itens"
          data-motion="command-trigger"
        >
          <Search size={16} />
          <span>Áreas, missões, projetos…</span>
          <span className="key-hint">
            <Command size={12} />K
          </span>
        </button>
      </div>
      <WorkspaceRail pathname={pathname} />
      <div className="topbar__actions">
        <button
          className="quick-add-top"
          onClick={() => emitUI("quickAdd")}
          data-motion="primary-action"
        >
          <Plus size={15} />
          <span>Novo</span>
        </button>
        {pathname !== "/nex" && (
          <button
            className="icon-button"
            onClick={() => emitUI("nex")}
            aria-label="Abrir N.E.X"
          >
            <Brain size={18} />
          </button>
        )}
        <button
          className="icon-button"
          onClick={preferences.show}
          aria-label="Preferências de aparência"
        >
          <Settings2 size={17} />
        </button>
        <button
          className="icon-button notification-button"
          onClick={() => emitUI("notifications")}
          aria-label={`Notificações${notifications.length ? `: ${notifications.length} lembretes` : ""}`}
          data-motion="icon-action"
        >
          <Bell size={17} />
          {notifications.length > 0 && <span aria-hidden="true" />}
        </button>
        <button
          className="avatar avatar--button"
          title={`${name} · editar perfil`}
          onClick={() => emitUI("profile")}
          aria-label="Editar perfil"
          data-motion="avatar"
        >
          {avatarUrl ? <img src={avatarUrl} alt="" /> : initials}
        </button>
      </div>
      {preferences.open && (
        <ModalSurface
          label="Seu ambiente"
          onClose={preferences.close}
          className="overlay"
        >
          <section className="shell-preferences">
            <header>
              <h2 id="shell-preferences-title">Seu ambiente</h2>
              <button
                className="icon-button"
                onClick={preferences.close}
                aria-label="Fechar preferências"
              >
                ×
              </button>
            </header>
            <p>Tema e movimento</p>
            <AppearanceControls />
            <p>
              Nível {workspace.profile?.level ?? 1} ·{" "}
              {workspace.profile?.streak_current ?? 0} dias de sequência
            </p>
            {installPrompt && (
              <button className="secondary-button" onClick={install}>
                <Download size={17} />
                Instalar NexOS
              </button>
            )}
          </section>
        </ModalSurface>
      )}
    </header>
  );
}
