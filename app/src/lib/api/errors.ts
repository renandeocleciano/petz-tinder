export type ApiErrorCode =
  | 'premium_required'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'unavailable'
  | 'network'
  | 'unknown';

export interface ApiErrorOptions {
  /** Backend error code (e.g. `PET_NOT_FOUND`), when the server sent one. */
  serverCode?: string;
  /** Matches the `x-request-id` in the backend logs. */
  requestId?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly serverCode?: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.serverCode = options.serverCode;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

export const isPremiumRequired = (error: unknown): boolean =>
  isApiError(error) && error.code === 'premium_required';

export const premiumRequired = (feature: string) =>
  new ApiError(402, 'premium_required', `Recurso premium necessário: ${feature}`);

export const notFound = (entity: string) =>
  new ApiError(404, 'not_found', `${entity} não encontrado`);

/** For features the app shows but the backend does not offer yet. */
export const unavailable = (feature: string) =>
  new ApiError(501, 'unavailable', `${feature} ainda não está disponível.`);

export const getErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    if (error.code === 'network') return 'Sem conexão. Verifique sua internet e tente novamente.';
    if (error.code === 'rate_limited')
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    if (error.code === 'unauthorized') return 'Sua sessão expirou. Entre novamente.';
    if (error.code === 'unknown' || !error.message) return 'Algo deu errado. Tente novamente.';
    return error.message;
  }
  return 'Algo deu errado. Tente novamente.';
};
