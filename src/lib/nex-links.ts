export function safeGoogleLink(value: unknown) {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      [
        "docs.google.com",
        "calendar.google.com",
        "tasks.google.com",
        "drive.google.com",
      ].includes(u.hostname)
      ? u.href
      : null;
  } catch {
    return null;
  }
}
