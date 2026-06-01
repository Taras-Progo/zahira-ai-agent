import { useAuthStore } from "@/store/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skip the auth header (used for the login call). */
  noAuth?: boolean;
}

async function rawRequest<T>(
  path: string,
  options: RequestOptions = {},
  retry = true,
): Promise<T> {
  const { token } = useAuthStore.getState();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (!options.noAuth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}/api${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 && retry && !options.noAuth) {
    // Attempt one silent refresh via the httpOnly cookie.
    const refreshed = await tryRefresh();
    if (refreshed) return rawRequest<T>(path, options, false);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(
      res.status,
      err.code ?? "ERROR",
      err.message ?? "Erro na requisição",
      err.details,
    );
  }
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) {
      useAuthStore.getState().clear();
      return false;
    }
    const data = (await res.json()) as { token: string };
    useAuthStore.getState().setToken(data.token);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  get: <T>(path: string) => rawRequest<T>(path),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    rawRequest<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    rawRequest<T>(path, { method: "PUT", body }),
  del: <T>(path: string) => rawRequest<T>(path, { method: "DELETE" }),
};
