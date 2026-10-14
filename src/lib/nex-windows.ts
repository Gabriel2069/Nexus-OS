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
export type WindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export type WindowLayout = "free" | "left" | "right" | "maximized";
/** Geometry is local to the desktop, never persisted with private record data. */
export function fitWindow(
  b: WindowBounds,
  vw: number,
  vh: number,
): WindowBounds {
  const width = Math.min(Math.max(300, b.width), Math.max(1, vw - 24));
  const height = Math.min(Math.max(220, b.height), Math.max(1, vh - 144));
  return { ...clampWindow(b.x, b.y, width, height, vw, vh), width, height };
}
export function layoutWindow(
  layout: Exclude<WindowLayout, "free">,
  vw: number,
  vh: number,
): WindowBounds {
  const width = layout === "maximized" ? vw - 24 : (vw - 36) / 2;
  return fitWindow(
    { x: layout === "right" ? 24 + width : 12, y: 68, width, height: vh - 144 },
    vw,
    vh,
  );
}
export function arrangeWindows(
  count: number,
  vw: number,
  vh: number,
): WindowBounds[] {
  const columns = Math.max(1, Math.min(count, Math.floor((vw - 12) / 312)));
  const rows = Math.ceil(count / columns);
  const width = (vw - 24 - (columns - 1) * 12) / columns;
  const height = (vh - 144 - (rows - 1) * 12) / rows;
  return Array.from({ length: count }, (_, i) =>
    fitWindow(
      height >= 220
        ? {
            x: 12 + (i % columns) * (width + 12),
            y: 68 + Math.floor(i / columns) * (height + 12),
            width,
            height,
          }
        : { x: 24 + i * 28, y: 80 + i * 24, width: 440, height: 510 },
      vw,
      vh,
    ),
  );
}
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
        title:
          previous.body.kind === "data" && next.body.kind === "data"
            ? next.title
            : previous.title,
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
