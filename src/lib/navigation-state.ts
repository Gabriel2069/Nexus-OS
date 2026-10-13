export const MAX_PINNED = 6;
export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export function cleanPaths(
  value: unknown,
  allowed: string[],
  limit = MAX_PINNED,
): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (p): p is string => typeof p === "string" && allowed.includes(p),
          ),
        ),
      ].slice(0, limit)
    : [];
}
export function entityPath(kind: "mission" | "project", id: string) {
  const params = new URLSearchParams({ [kind]: id });
  return `${kind === "mission" ? "/missoes" : "/projetos"}?${params}`;
}
