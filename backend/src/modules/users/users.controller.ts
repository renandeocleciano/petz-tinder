import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';

import type { EntitlementsService } from '../entitlements/entitlements.service.js';
import type { PetsService } from '../pets/pets.service.js';
import { toUserDto, type updateMeBodySchema } from './users.schemas.js';
import type { UsersService } from './users.service.js';

export const createUsersController = (
  service: UsersService,
  petsService: PetsService,
  entitlements: EntitlementsService,
) => ({
  async getMe(request: FastifyRequest) {
    const [user, pets, tier] = await Promise.all([
      service.getMe(request.auth.userId),
      petsService.listMine(request.auth.userId),
      entitlements.tier(request.auth.userId),
    ]);
    return { user: toUserDto(user, tier), pets };
  },

  async listMyPets(request: FastifyRequest) {
    return { data: await petsService.listMine(request.auth.userId) };
  },

  async updateMe(request: FastifyRequest<{ Body: z.output<typeof updateMeBodySchema> }>) {
    const [user, tier] = await Promise.all([
      service.updateMe(request.auth.userId, request.body),
      entitlements.tier(request.auth.userId),
    ]);
    return { user: toUserDto(user, tier) };
  },

  async deleteMe(request: FastifyRequest, reply: FastifyReply) {
    await service.deleteAccount(request.auth.userId, request.auth.clerkUserId);
    request.log.info('Account deleted');
    return reply.status(204).send();
  },
});
