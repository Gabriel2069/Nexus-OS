import { useEffect, useState } from "react";
export function navigate(path: string) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin)
    throw new Error("Use uma rota interna do NexOS.");
  if (
    window.location.pathname + window.location.search + window.location.hash ===
    url.pathname + url.search + url.hash
  )
    return;
  window.history.pushState({}, "", url.pathname + url.search + url.hash);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth",
  });
}
export function useLocation() {
  const read = () => ({
    pathname: window.location.pathname,
    search: window.location.search,
  });
  const [location, setLocation] = useState(read);
  useEffect(() => {
    const update = () => setLocation(read());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  return location;
}
export function usePathname() {
  return useLocation().pathname;
}
