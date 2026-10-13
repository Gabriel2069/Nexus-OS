import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
  type PropsWithChildren,
} from "react";
import { canonicalDestination, navigation } from "../data/navigation";
import { useNexus } from "./NexusContext";
import { useLocation } from "../lib/router";
import { cleanPaths, MAX_PINNED } from "../lib/navigation-state";
import { isDemoMode } from "../lib/supabase";

export const destinations = navigation.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);
const paths = destinations.map((item) => item.path);
const defaults = ["/hoje", "/missoes", "/projetos", "/estudos"];
type Preferences = { pinned: string[]; recent: string[] };
function read(scope: string | null): Preferences {
  try {
    const data = scope
      ? JSON.parse(localStorage.getItem(`nexos:navigation:${scope}`) ?? "null")
      : null;
    return {
      pinned: Array.isArray(data?.pinned)
        ? cleanPaths(
            data.pinned,
            paths.filter((p) => p !== "/"),
          )
        : defaults,
      recent: cleanPaths(data?.recent, paths, 5),
    };
  } catch {
    return { pinned: defaults, recent: [] };
  }
}
const Context = createContext<{
  drafts: Map<string, unknown>;
  pinned: string[];
  recent: string[];
  togglePin: (path: string) => void;
  message: string;
  clearRecent: () => void;
} | null>(null);
export function NavigationProvider({ children }: PropsWithChildren) {
  const { userId } = useNexus();
  const scope = userId ?? (isDemoMode ? "demo" : null);
  // The keyed inner owner resets preferences synchronously when the account changes.
  return (
    <NavigationOwner key={scope ?? "pending"} scope={scope}>
      {children}
    </NavigationOwner>
  );
}
function NavigationOwner({
  scope,
  children,
}: PropsWithChildren<{ scope: string | null }>) {
  const drafts = useRef(new Map<string, unknown>());
  const location = useLocation();
  const [prefs, setPrefs] = useState(() => read(scope));
  const [message, setMessage] = useState("");
  const currentPath = canonicalDestination(location.pathname);
  useEffect(() => {
    if (!paths.includes(currentPath) || currentPath === "/") return;
    setPrefs((current) => ({
      ...current,
      recent: [
        currentPath,
        ...current.recent.filter((p) => p !== currentPath),
      ].slice(0, 5),
    }));
  }, [currentPath]);
  useEffect(() => {
    if (!scope) return;
    try {
      localStorage.setItem(`nexos:navigation:${scope}`, JSON.stringify(prefs));
    } catch {
      /* Navigation remains available without storage. */
    }
  }, [prefs, scope]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timer);
  }, [message]);
  const value = useMemo(
    () => ({
      ...prefs,
      drafts: drafts.current,
      message,
      togglePin: (path: string) => {
        if (!paths.includes(path) || path === "/") return;
        const exists = prefs.pinned.includes(path);
        if (!exists && prefs.pinned.length >= MAX_PINNED) {
          setMessage(
            "Você pode fixar até seis áreas. Desfixe uma para trocar.",
          );
          return;
        }
        setMessage(
          exists ? "Área desfixada." : "Área fixada nos seus atalhos.",
        );
        setPrefs((current) => ({
          ...current,
          pinned: current.pinned.includes(path)
            ? current.pinned.filter((p) => p !== path)
            : current.pinned.length < MAX_PINNED
              ? [...current.pinned, path]
              : current.pinned,
        }));
      },
      clearRecent: () => setPrefs((current) => ({ ...current, recent: [] })),
    }),
    [prefs, message],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useNavigation() {
  const context = useContext(Context);
  if (!context) throw Error("NavigationProvider ausente");
  return context;
}

export function useEntityDraft<T>(
  identity: ["mission" | "project", string],
  initial: T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const { drafts } = useNavigation();
  const key = JSON.stringify(identity);
  const [value, setValue] = useState<T>(() =>
    drafts.has(key) ? (drafts.get(key) as T) : initial,
  );
  const latest = useRef(value);
  const update: Dispatch<SetStateAction<T>> = (next) => {
    const resolved =
      typeof next === "function"
        ? (next as (prev: T) => T)(latest.current)
        : next;
    latest.current = resolved;
    drafts.set(key, resolved);
    setValue(resolved);
  };
  return [value, update, () => drafts.delete(key)];
}
