import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { BlockedUser, BlocksRepository } from './blocks.repository.js';
import { MAX_BLOCKS_LISTED, type BlockDto } from './blocks.schemas.js';

interface Deps {
  repository: BlocksRepository;
  users: Pick<UsersRepository, 'findById'>;
}

const toDto = (blocked: BlockedUser): BlockDto => ({
  ...blocked,
  createdAt: blocked.createdAt.toISOString(),
});

/**
 * Blocks are per user and reversible. Their effects live in the read paths: discovery,
 * map, likes, matches, conversations and Realtime all exclude blocked pairs, in both
 * directions. Nothing is deleted, so unblocking restores matches and conversations.
 */
export const createBlocksService = ({ repository, users }: Deps) => ({
  async block(userId: string, targetUserId: string): Promise<BlockDto> {
    if (targetUserId === userId) throw new ValidationError('Você não pode bloquear a si mesmo');
    if (!(await users.findById(targetUserId))) {
      throw new NotFoundError('Usuário não encontrado', 'USER_NOT_FOUND');
    }
    await repository.block(userId, targetUserId);
    const blocked = (await repository.list(userId, MAX_BLOCKS_LISTED)).find(
      (item) => item.userId === targetUserId,
    );
    if (!blocked) throw new NotFoundError('Usuário não encontrado', 'USER_NOT_FOUND');
    return toDto(blocked);
  },

  unblock: (userId: string, targetUserId: string) => repository.unblock(userId, targetUserId),

  async list(userId: string): Promise<BlockDto[]> {
    return (await repository.list(userId, MAX_BLOCKS_LISTED)).map(toDto);
  },
});

export type BlocksService = ReturnType<typeof createBlocksService>;
