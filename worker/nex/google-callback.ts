// Explicit compatibility alias for the URI already saved in Cloudflare/Google.
// Both endpoints use the same state, PKCE, encrypted cookie and owner checks.
export const googleCallbackPaths = [
  "/api/nex/google/callback",
  "/api/integrations/google/callback",
] as const;
export const isGoogleCallback = (path: string) =>
  googleCallbackPaths.some((candidate) => candidate === path);
