import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { errorResponseSchema } from '../../shared/schemas/error.js';
import { createPetsController } from './pets.controller.js';
import {
  addPhotoBodySchema,
  createPetBodySchema,
  petIdParamsSchema,
  petPhotoParamsSchema,
  petResponseSchema,
  updatePetBodySchema,
} from './pets.schemas.js';
import type { PetsService } from './pets.service.js';

export interface PetsRoutesOptions {
  petsService: PetsService;
}

const tags = ['pets'];
const errors = {
  403: errorResponseSchema,
  404: errorResponseSchema,
  409: errorResponseSchema,
  422: errorResponseSchema,
};

export const petsRoutes: FastifyPluginAsyncZod<PetsRoutesOptions> = async (
  app,
  { petsService },
) => {
  const controller = createPetsController(petsService);

  app.post(
    '/',
    {
      schema: { tags, body: createPetBodySchema, response: { 201: petResponseSchema, ...errors } },
    },
    controller.create,
  );

  app.get(
    '/:id',
    {
      schema: { tags, params: petIdParamsSchema, response: { 200: petResponseSchema, ...errors } },
    },
    controller.get,
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags,
        params: petIdParamsSchema,
        body: updatePetBodySchema,
        response: { 200: petResponseSchema, ...errors },
      },
    },
    controller.update,
  );

  app.delete(
    '/:id',
    { schema: { tags, params: petIdParamsSchema, response: { 204: z.null(), ...errors } } },
    controller.remove,
  );

  app.post(
    '/:id/photos',
    {
      schema: {
        tags,
        params: petIdParamsSchema,
        body: addPhotoBodySchema,
        response: { 201: petResponseSchema, ...errors },
      },
    },
    controller.addPhoto,
  );

  app.delete(
    '/:id/photos/:photoId',
    { schema: { tags, params: petPhotoParamsSchema, response: { 204: z.null(), ...errors } } },
    controller.removePhoto,
  );
};

export default petsRoutes;
