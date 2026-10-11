export const APP_TIMEZONE = "America/Sao_Paulo";
export function dateKey(date: Date = new Date(), timezone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
// Civil dates use noon UTC as a carrier, never browser-local midnight.
export function civilDate(key: string) {
  return new Date(`${key}T12:00:00Z`);
}
export function monthDate(year: number, month: number, day = 1) {
  return new Date(Date.UTC(year, month, day, 12));
}
export function shiftDate(date: Date, days: number) {
  return monthDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
  );
}
