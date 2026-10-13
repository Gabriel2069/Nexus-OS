import { Plus } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { MobileDock } from "./MobileDock";
import { NotificationCenter } from "./NotificationCenter";
import { ProfileModal } from "./ProfileModal";
import { QuickCaptureModal } from "./QuickCaptureModal";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CosmicEnvironment } from "./CosmicEnvironment";
import { emitUI } from "../lib/ui-events";

type AppShellProps = PropsWithChildren<{ pathname: string }>;
type IOSNavigator = Navigator & { standalone?: boolean };

export function AppShell({ pathname, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("nexus-sidebar") === "collapsed",
  );
  useEffect(() => {
    localStorage.setItem("nexus-sidebar", collapsed ? "collapsed" : "open");
  }, [collapsed]);
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as IOSNavigator).standalone);
    document.documentElement.classList.toggle("nexus-standalone", standalone);
    return () => document.documentElement.classList.remove("nexus-standalone");
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        document.querySelector('[aria-modal="true"]') ||
        (event.target instanceof HTMLElement &&
          event.target.closest(
            'input, textarea, select, [contenteditable="true"]',
          ))
      )
        return;
      if (event.key.toLowerCase() === "n") emitUI("quickAdd");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      <a className="skip-link" href="#nexos-content">
        Ir para o conteúdo
      </a>
      <CosmicEnvironment />
      <Sidebar
        pathname={pathname}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <div className="app-shell__content">
        <Topbar pathname={pathname} />
        <main
          id="nexos-content"
          tabIndex={-1}
          className="page-content"
          key={pathname}
        >
          {children}
        </main>
      </div>
      <button
        className="floating-add"
        onClick={() => emitUI("quickAdd")}
        aria-label="Captura rápida"
      >
        <Plus size={22} aria-hidden="true" />
      </button>
      <MobileDock pathname={pathname} />
      <CommandPalette />
      <QuickCaptureModal />
      <ProfileModal />
      <NotificationCenter />
    </div>
  );
}
