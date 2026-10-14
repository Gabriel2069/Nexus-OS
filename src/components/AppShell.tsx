const NexDesktop = lazy(() =>
  import("./NexDesktop").then((m) => ({ default: m.NexDesktop })),
);
import { useNex } from "../context/NexContext";
import { NexModuleBridge } from "./NexModuleBridge";
import { useOverlay } from "../lib/use-overlay";
const NexOverlay = lazy(() =>
  import("./NexConsole").then((m) => ({ default: m.NexOverlay })),
);
import { RelatedAreas } from "./RelatedAreas";
import { Plus } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useEffect, useState, lazy, Suspense } from "react";
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
  const nexOverlay = useOverlay("nex");
  const nex = useNex();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("nexus-sidebar") !== "open";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("nexus-sidebar", collapsed ? "collapsed" : "open");
    } catch {
      /* The menu still works without persistent storage. */
    }
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
          <NexModuleBridge pathname={pathname} />
          {children}
          <RelatedAreas pathname={pathname} />
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
      {pathname !== "/nex" && nexOverlay.open && (
        <Suspense fallback={<p role="status">Abrindo N.E.X…</p>}>
          <NexOverlay onClose={nexOverlay.close} />
        </Suspense>
      )}
      {!!nex.windows.length && (
        <Suspense fallback={<p role="status">Abrindo instrumentos…</p>}>
          <NexDesktop />
        </Suspense>
      )}
      <CommandPalette />
      <QuickCaptureModal />
      <ProfileModal />
      <NotificationCenter />
    </div>
  );
}
