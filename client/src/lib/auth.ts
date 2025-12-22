const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** Build full API URL from a path like "/api/auth/login" */
export function apiUrl(path: string): string {
  const base = ((import.meta as any).env?.HA_BASE_URL as string | undefined) ?? "";
  const trimmedBase = base.replace(/\/+$/, "");
  if (!trimmedBase) return path;
  if (!path.startsWith("/")) return path;
  return `${trimmedBase}${path}`;
}

