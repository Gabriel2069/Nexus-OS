import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

type Appearance = {
  dark: boolean;
  toggleTheme: () => void;
  atmosphere: boolean;
  reduced: boolean;
  toggleAtmosphere: () => void;
};
const Context = createContext<Appearance | null>(null);
function saved(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences remain usable when storage is unavailable. */
  }
}

/** One preference owner for login, shell and portal surfaces. */
export function AppearanceProvider({ children }: PropsWithChildren) {
  const [dark, setDark] = useState(() => saved("nexus-theme") !== "light");
  const [requested, setRequested] = useState(
    () => saved("nexos-atmosphere") !== "paused",
  );
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#050816" : "#eef3fb");
    save("nexus-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      root.dataset.atmosphere =
        requested && !reduced && !document.hidden ? "running" : "paused";
    };
    update();
    save("nexos-atmosphere", requested ? "running" : "paused");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [requested, reduced]);
  return (
    <Context.Provider
      value={{
        dark,
        toggleTheme: () => setDark((v) => !v),
        atmosphere: requested && !reduced,
        reduced,
        toggleAtmosphere: () => setRequested((v) => !v),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAppearance() {
  const value = useContext(Context);
  if (!value) throw new Error("AppearanceProvider is required");
  return value;
}
