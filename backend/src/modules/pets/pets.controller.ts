import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';

import type {
  addPhotoBodySchema,
  createPetBodySchema,
  petIdParamsSchema,
  petPhotoParamsSchema,
  updatePetBodySchema,
} from './pets.schemas.js';
import type { PetsService } from './pets.service.js';

type Params = { Params: z.output<typeof petIdParamsSchema> };
type PhotoParams = { Params: z.output<typeof petPhotoParamsSchema> };

export const createPetsController = (service: PetsService) => ({
  async create(
    request: FastifyRequest<{ Body: z.output<typeof createPetBodySchema> }>,
    reply: FastifyReply,
  ) {
    const pet = await service.create(request.auth.userId, request.body);
    return reply.status(201).send({ pet });
  },

  async get(request: FastifyRequest<Params>) {
    return { pet: await service.get(request.auth.userId, request.params.id) };
  },

  async update(request: FastifyRequest<Params & { Body: z.output<typeof updatePetBodySchema> }>) {
    return { pet: await service.update(request.auth.userId, request.params.id, request.body) };
  },

  async remove(request: FastifyRequest<Params>, reply: FastifyReply) {
    await service.remove(request.auth.userId, request.params.id);
    return reply.status(204).send();
  },

  async addPhoto(
    request: FastifyRequest<Params & { Body: z.output<typeof addPhotoBodySchema> }>,
    reply: FastifyReply,
  ) {
    const pet = await service.addPhoto(request.auth.userId, request.params.id, request.body.path);
    return reply.status(201).send({ pet });
  },

  async removePhoto(request: FastifyRequest<PhotoParams>, reply: FastifyReply) {
    await service.removePhoto(request.auth.userId, request.params.id, request.params.photoId);
    return reply.status(204).send();
  },
});
