import { ConflictError, DomainError, ValidationError } from '../../shared/errors/index.js';

export class AlreadyMatchedError extends ConflictError {
  constructor() {
    super('Esses pets já deram match', 'ALREADY_MATCHED');
  }
}

export class SuperLikeLimitError extends DomainError {
  constructor(limit: number) {
    super(402, 'PREMIUM_REQUIRED', 'Você já usou seu super like de hoje', {
      details: { feature: 'SUPER_LIKE', limitPerDay: limit },
    });
  }
}

export class OwnPetLikeError extends ValidationError {
  constructor() {
    super('Não é possível curtir um pet seu');
  }
}
