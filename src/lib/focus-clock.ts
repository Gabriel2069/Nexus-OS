export type FocusClock = {
  elapsedMs: number;
  resumedAt: number | null;
  plannedMs: number;
};
export function elapsedFocus(clock: FocusClock, now: number) {
  return Math.min(
    clock.plannedMs,
    Math.max(
      0,
      clock.elapsedMs +
        (clock.resumedAt === null ? 0 : Math.max(0, now - clock.resumedAt)),
    ),
  );
}
export function pauseFocus(clock: FocusClock, now: number): FocusClock {
  return { ...clock, elapsedMs: elapsedFocus(clock, now), resumedAt: null };
}

export function validFocusMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 240
  );
}
