import { getAuthToken } from '../authToken';
import { ApiError, type ApiErrorCode } from '../errors';

export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type QueryValue = string | number | boolean | undefined | null;
/** Arrays become repeated params (`species=dog&species=cat`), as the backend expects. */
export type Query = Record<string, QueryValue | readonly QueryValue[]>;

/** The backend error envelope: `{ error: { code, message, requestId, details? } }`. */
interface ErrorEnvelope {
  error?: { code?: string; message?: string; requestId?: string; details?: unknown };
}

const codeForStatus = (status: number): ApiErrorCode => {
  if (status === 401) return 'unauthorized';
  if (status === 402) return 'premium_required';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422 || status === 400) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status === 501) return 'unavailable';
  return 'unknown';
};

const API_VERSION = '/v1';

/** Accepts the base URL with or without `/v1` and a trailing slash. */
export const normalizeBaseUrl = (baseUrl: string) =>
  baseUrl.replace(/\/+$/, '').replace(/\/v1$/, '');

const buildUrl = (baseUrl: string, path: string, query?: Query) => {
  const url = `${baseUrl}${API_VERSION}${path}`;
  if (!query) return url;
  const params = Object.entries(query).flatMap(([key, value]) =>
    (Array.isArray(value) ? value : [value])
      .filter((item): item is string | number | boolean => item !== undefined && item !== null)
      .map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`),
  );
  return params.length > 0 ? `${url}?${params.join('&')}` : url;
};

export const toApiError = async (response: Response): Promise<ApiError> => {
  const payload = (await response.json().catch(() => null)) as ErrorEnvelope | null;
  const error = payload?.error;
  return new ApiError(
    response.status,
    codeForStatus(response.status),
    error?.message ?? response.statusText,
    {
      serverCode: error?.code,
      requestId: error?.requestId ?? response.headers.get('x-request-id') ?? undefined,
      details: error?.details,
    },
  );
};

export type Request = <T>(
  method: Method,
  path: string,
  body?: unknown,
  query?: Query,
) => Promise<T>;

export const createRequest =
  (rawBaseUrl: string): Request =>
  async <T>(method: Method, path: string, body?: unknown, query?: Query) => {
    const baseUrl = normalizeBaseUrl(rawBaseUrl);
    const token = await getAuthToken();
    let response: Response;
    try {
      response = await fetch(buildUrl(baseUrl, path, query), {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'network', 'Network request failed');
    }

    if (!response.ok) throw await toApiError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  };
