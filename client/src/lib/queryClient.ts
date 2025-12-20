import { QueryClient } from "@tanstack/react-query";
import { getToken, clearToken } from "./auth";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getApiBaseUrl() {
  // Example: https://your-backend.netlify.app
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  return base.replace(/\/+$/, "");
}

function withApiBase(url: string) {
  const base = getApiBaseUrl();
  if (!base) return url;
  if (!url.startsWith("/")) return url;
  return `${base}${url}`;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCredentials(): RequestCredentials {
  // For separate domains, cookies are usually not needed. Default to omit.
  const mode = (import.meta.env.VITE_API_CREDENTIALS as string | undefined) ?? "omit";
  return mode === "include" ? "include" : "omit";
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = { ...authHeaders() };
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(withApiBase(url), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: getCredentials(),
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => (ctx: { queryKey: any[] }) => Promise<T | null> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = withApiBase(queryKey.join("/") as string);
    const res = await fetch(url, {
      headers: authHeaders(),
      credentials: getCredentials(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      clearToken();
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
