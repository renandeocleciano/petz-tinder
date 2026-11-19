import { DomainError } from '../../shared/errors/index.js';

export class MediaNotFoundError extends DomainError {
  constructor() {
    super(422, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado. Envie a imagem antes de vinculá-la.');
  }
}
