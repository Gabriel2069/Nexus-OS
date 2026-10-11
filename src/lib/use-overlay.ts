import { useCallback, useEffect, useState } from "react";
import { UI_EVENTS, emitUI } from "./ui-events";

export function useOverlay(kind: keyof typeof UI_EVENTS) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const listeners = Object.entries(UI_EVENTS).map(([name, event]) => {
      const listener = () => setOpen(name === kind);
      window.addEventListener(event, listener);
      return () => window.removeEventListener(event, listener);
    });
    return () => listeners.forEach((remove) => remove());
  }, [kind]);
  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => emitUI(kind), [kind]);
  return { open, setOpen, close, show };
}
