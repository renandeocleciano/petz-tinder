export interface DomainErrorOptions {
  details?: unknown;
  cause?: unknown;
}

/**
 * Base class for every error the API returns on purpose. Anything that is not a
 * DomainError is treated as unexpected and answered with a generic 500.
 */
export class DomainError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, options: DomainErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Dados inválidos', options?: DomainErrorOptions) {
    super(422, 'VALIDATION_ERROR', message, options);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Não autenticado', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class PremiumRequiredError extends DomainError {
  constructor(message = 'Recurso disponível no Petz Premium') {
    super(402, 'PREMIUM_REQUIRED', message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Acesso negado', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Recurso não encontrado', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Conflito', code = 'CONFLICT') {
    super(409, code, message);
  }
}
