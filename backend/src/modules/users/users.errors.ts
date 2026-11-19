import { NotFoundError } from '../../shared/errors/index.js';

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super('Usuário não encontrado', 'USER_NOT_FOUND');
  }
}
