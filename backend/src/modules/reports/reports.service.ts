import { NotFoundError, ValidationError } from '../../shared/errors/index.js';
import { PetNotFoundError } from '../pets/pets.errors.js';
import type { PetsRepository } from '../pets/pets.repository.js';
import type { UsersRepository } from '../users/users.repository.js';
import type { ReportsRepository } from './reports.repository.js';
import type { CreateReportBody, ReportDto } from './reports.schemas.js';

interface Deps {
  repository: ReportsRepository;
  users: Pick<UsersRepository, 'findById'>;
  petsRepository: Pick<PetsRepository, 'findById'>;
}

/**
 * Reports are stored for moderation (status `open`). Reporting does not block: the app
 * offers blocking as a separate action. Rate limited to 5 per hour per user.
 */
export const createReportsService = ({ repository, users, petsRepository }: Deps) => ({
  async create(userId: string, input: CreateReportBody): Promise<ReportDto> {
    if (input.targetUserId === userId)
      throw new ValidationError('Você não pode denunciar a si mesmo');
    if (!(await users.findById(input.targetUserId))) {
      throw new NotFoundError('Usuário não encontrado', 'USER_NOT_FOUND');
    }
    if (input.targetPetId) {
      const pet = await petsRepository.findById(input.targetPetId);
      if (!pet || pet.ownerId !== input.targetUserId) throw new PetNotFoundError();
    }
    const row = await repository.insert({
      reporterId: userId,
      targetUserId: input.targetUserId,
      targetPetId: input.targetPetId ?? null,
      reason: input.reason,
      description: input.description ?? null,
    });
    return {
      id: row.id,
      targetUserId: input.targetUserId,
      targetPetId: row.targetPetId,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
    };
  },
});

export type ReportsService = ReturnType<typeof createReportsService>;
