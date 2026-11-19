import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { errorResponseSchema } from '../../shared/schemas/error.js';
import type { EntitlementsService } from '../entitlements/entitlements.service.js';
import { createUsersController } from './users.controller.js';
import { petListResponseSchema } from '../pets/pets.schemas.js';
import type { PetsService } from '../pets/pets.service.js';
import { meResponseSchema, updateMeBodySchema, userResponseSchema } from './users.schemas.js';
import type { UsersService } from './users.service.js';

export interface UsersRoutesOptions {
  usersService: UsersService;
  petsService: PetsService;
  entitlements: EntitlementsService;
}

const tags = ['users'];

export const usersRoutes: FastifyPluginAsyncZod<UsersRoutesOptions> = async (
  app,
  { usersService, petsService, entitlements },
) => {
  const controller = createUsersController(usersService, petsService, entitlements);

  app.get(
    '/me',
    { schema: { tags, response: { 200: meResponseSchema, 401: errorResponseSchema } } },
    controller.getMe,
  );

  app.patch(
    '/me',
    {
      schema: {
        tags,
        body: updateMeBodySchema,
        response: { 200: userResponseSchema, 422: errorResponseSchema },
      },
    },
    controller.updateMe,
  );

  app.get(
    '/me/pets',
    { schema: { tags, response: { 200: petListResponseSchema } } },
    controller.listMyPets,
  );

  app.delete(
    '/me',
    { schema: { tags, response: { 204: z.null(), 401: errorResponseSchema } } },
    controller.deleteMe,
  );
};

export default usersRoutes;
