export const COOKIE_NAME = "nex_gestao_juridica_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const normalizeUrlBase = (value: unknown): string | null => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw === "undefined" || raw === "null") return null;
  try { return new URL(raw).origin; } catch { try { return new URL(`https://${raw}`).origin; } catch { return null; } }
};

export const isLocalDemoMode = () => {
  const explicitDemo = import.meta.env.VITE_NEX_DEMO_MODE;
  if (explicitDemo === "false") return false;
  const oauthPortalUrl = normalizeUrlBase(import.meta.env.VITE_OAUTH_PORTAL_URL);
  const appId = typeof import.meta.env.VITE_APP_ID === "string" ? import.meta.env.VITE_APP_ID.trim() : "";
  return !oauthPortalUrl || !appId;
};

export const getLoginUrl = () => {
  const oauthPortalUrl = normalizeUrlBase(import.meta.env.VITE_OAUTH_PORTAL_URL);
  const appId = typeof import.meta.env.VITE_APP_ID === "string" ? import.meta.env.VITE_APP_ID.trim() : "";
  if (!oauthPortalUrl || !appId) return "/";
  try {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);
    const url = new URL("/app-auth", oauthPortalUrl);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch { return "/"; }
};
