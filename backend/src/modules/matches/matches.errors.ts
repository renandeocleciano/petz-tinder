import { NotFoundError } from '../../shared/errors/index.js';

export class MatchNotFoundError extends NotFoundError {
  constructor() {
    super('Match não encontrado', 'MATCH_NOT_FOUND');
  }
}
