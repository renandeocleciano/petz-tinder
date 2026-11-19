import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/index.js';

export class ConversationNotFoundError extends NotFoundError {
  constructor() {
    super('Conversa não encontrada', 'CONVERSATION_NOT_FOUND');
  }
}

export class MessageNotFoundError extends NotFoundError {
  constructor() {
    super('Mensagem não encontrada', 'MESSAGE_NOT_FOUND');
  }
}

export class PlaydateAlreadyAnsweredError extends ConflictError {
  constructor() {
    super('Este convite já foi respondido', 'PLAYDATE_ALREADY_ANSWERED');
  }
}

export class OwnPlaydateError extends ForbiddenError {
  constructor() {
    super('Quem respondeu o convite precisa ser o outro tutor', 'PLAYDATE_FORBIDDEN');
  }
}
