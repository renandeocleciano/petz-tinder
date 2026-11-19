import {
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/index.js';

export class PetNotFoundError extends NotFoundError {
  constructor() {
    super('Pet não encontrado', 'PET_NOT_FOUND');
  }
}

export class PetForbiddenError extends ForbiddenError {
  constructor() {
    super('Este pet não pertence a você', 'PET_FORBIDDEN');
  }
}

export class PetLimitReachedError extends ConflictError {
  constructor(limit: number) {
    super(`Limite de ${limit} pets por conta atingido`, 'PET_LIMIT_REACHED');
  }
}

export class PhotoLimitReachedError extends ConflictError {
  constructor(limit: number) {
    super(`Limite de ${limit} fotos por pet atingido`, 'PHOTO_LIMIT_REACHED');
  }
}

export class PhotoNotFoundError extends NotFoundError {
  constructor() {
    super('Foto não encontrada', 'PHOTO_NOT_FOUND');
  }
}

export class PhotoAlreadyUsedError extends ConflictError {
  constructor() {
    super('Esta foto já está vinculada a um pet', 'PHOTO_ALREADY_USED');
  }
}

export class PetSuspendedError extends ForbiddenError {
  constructor() {
    super('Este pet está suspenso', 'PET_SUSPENDED');
  }
}

/** Free accounts keep one pet; adding more is a premium feature (402 like other paywalls). */
export class MultiplePetsPremiumError extends DomainError {
  constructor(limit: number) {
    super(402, 'PREMIUM_REQUIRED', 'Cadastre mais pets com o Petz Premium', {
      details: { feature: 'MULTIPLE_PETS', limit },
    });
  }
}
