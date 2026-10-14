import type { NexOperation, NexPanel } from "./nex-tools.ts";
export type NexWindowBody =
  | { kind: "data"; data: unknown }
  | { kind: "panel"; panel: NexPanel }
  | { kind: "operation"; operation: NexOperation; operationId: string }
  | { kind: "proposal"; proposalId: string }
  | { kind: "help" }
  | { kind: "google"; service: string; resource: string }
  | { kind: "compose"; area: string };
export type NexWindow = {
  id: string;
  key: string;
  title: string;
  body: NexWindowBody;
  minimized: boolean;
};
export const MAX_NEX_WINDOWS = 6;
/** Never evict a pending approval or a draft to make room for another query. */
export function addNexWindow(
  windows: NexWindow[],
  next: NexWindow,
): NexWindow[] {
  const previous = windows.find((w) => w.key === next.key);
  if (previous)
    return [
      ...windows.filter((w) => w.id !== previous.id),
      {
        ...previous,
        body:
          previous.body.kind === "data" && next.body.kind === "data"
            ? next.body
            : previous.body,
        minimized: false,
      },
    ];
  if (windows.length >= MAX_NEX_WINDOWS) return windows;
  return [...windows, next];
}
export function clampWindow(
  x: number,
  y: number,
  width: number,
  height: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  return {
    x: Math.max(8, Math.min(x, Math.max(8, viewportWidth - width - 8))),
    y: Math.max(64, Math.min(y, Math.max(64, viewportHeight - height - 60))),
  };
}
