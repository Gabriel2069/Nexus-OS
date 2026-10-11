import test from "node:test";
import assert from "node:assert/strict";
import {
  APP_TIMEZONE,
  dateKey,
  civilDate,
  monthDate,
  shiftDate,
} from "../src/lib/dates.ts";
import { elapsedFocus, pauseFocus } from "../src/lib/focus-clock.ts";

test("São Paulo civil date remains correct across UTC midnight and browser timezones", () => {
  assert.equal(APP_TIMEZONE, "America/Sao_Paulo");
  assert.equal(dateKey(new Date("2026-10-12T01:00:00Z")), "2026-10-11");
  for (const browserTimezone of ["UTC", "America/Sao_Paulo", "Asia/Tokyo"]) {
    process.env.TZ = browserTimezone;
    const date = civilDate("2026-10-11");
    assert.equal(dateKey(date), "2026-10-11");
    assert.equal(
      dateKey(monthDate(date.getUTCFullYear(), date.getUTCMonth())),
      "2026-10-01",
    );
    assert.equal(dateKey(shiftDate(date, 1)), "2026-10-12");
  }
});
test("civil arithmetic crosses month, year and leap-day boundaries", () => {
  assert.equal(dateKey(shiftDate(civilDate("2024-02-28"), 1)), "2024-02-29");
  assert.equal(dateKey(shiftDate(civilDate("2026-12-31"), 1)), "2027-01-01");
  assert.equal(dateKey(monthDate(2026, 9, 1 - 4)), "2026-09-27");
});
test("focus counts active time, excludes a pause and survives delayed background ticks", () => {
  const clock = { elapsedMs: 0, resumedAt: 1000, plannedMs: 25 * 60_000 };
  const paused = pauseFocus(clock, 61_000);
  assert.equal(elapsedFocus(paused, 900_000), 60_000);
  const resumed = { ...paused, resumedAt: 900_000 };
  assert.equal(elapsedFocus(resumed, 960_000), 120_000);
  assert.equal(elapsedFocus(resumed, 9_000_000), clock.plannedMs);
  assert.equal(elapsedFocus({ ...clock, resumedAt: 2000 }, 1000), 0);
});
