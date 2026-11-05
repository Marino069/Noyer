import { API_URL } from "@/lib/env";
import {
  httpError,
  invalidResponseError,
  networkError,
  timeoutError,
  type ApiError,
  type ApiResult,
} from "./errors";

const DEFAULT_TIMEOUT_MS = 8000;
const GET_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Jamais de cache HTTP (données de stock). */
  noStore?: boolean;
  /** Étiquettes de cache Next.js, pour la revalidation à la demande (webhook). */
  tags?: string[];
};

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = `${API_URL.replace(/\/$/, "")}${path}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

// Réseau, timeout, 429 et 5xx : seuls cas où un nouvel essai a un sens.
const isRetryable = (error: ApiError) =>
  error.kind === "network" ||
  error.kind === "timeout" ||
  error.status === 429 ||
  error.status >= 500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function attempt<T>(
  path: string,
  {
    method = "GET",
    query,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    noStore,
    tags,
  }: RequestOptions,
): Promise<ApiResult<T>> {
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      credentials: "include",
      ...(noStore && { cache: "no-store" as const }),
      ...(tags && !noStore && { next: { tags } }),
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });

    if (response.status === 204 || response.status === 202) {
      const text = await response.text();
      return { ok: true, data: (text ? JSON.parse(text) : null) as T };
    }

    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      if (response.ok)
        return { ok: false, error: invalidResponseError(response.status) };
    }
    if (!response.ok)
      return { ok: false, error: httpError(response.status, json) };
    return { ok: true, data: json as T };
  } catch (e) {
    if (timeout.aborted) return { ok: false, error: timeoutError() };
    if (signal?.aborted) throw e; // annulation voulue par l'appelant
    return { ok: false, error: networkError() };
  }
}

/**
 * Appelle l'API sans jamais lever d'exception : le résultat est soit `{ ok: true, data }`,
 * soit `{ ok: false, error }` affichable. Les GET sont rejoués en cas d'échec transitoire.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const retries = (options.method ?? "GET") === "GET" ? GET_RETRIES : 0;
  let result = await attempt<T>(path, options);
  for (let i = 0; i < retries && !result.ok && isRetryable(result.error); i++) {
    await sleep(RETRY_BASE_DELAY_MS * 2 ** i);
    result = await attempt<T>(path, options);
  }
  return result;
}
