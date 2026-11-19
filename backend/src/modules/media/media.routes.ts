import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { RATE_LIMITS } from '../../config/constants.js';
import { errorResponseSchema } from '../../shared/schemas/error.js';
import { uploadUrlBodySchema, uploadUrlResponseSchema } from './media.schemas.js';
import type { MediaService } from './media.service.js';

export interface MediaRoutesOptions {
  mediaService: MediaService;
}

/**
 * Files never pass through the API: the app asks for a signed URL, uploads straight to
 * Supabase Storage, then links the returned `path` to a resource (e.g. POST /pets/:id/photos).
 */
export const mediaRoutes: FastifyPluginAsyncZod<MediaRoutesOptions> = async (
  app,
  { mediaService },
) => {
  app.post(
    '/upload-url',
    {
      config: { rateLimit: RATE_LIMITS.uploads },
      schema: {
        tags: ['media'],
        body: uploadUrlBodySchema,
        response: { 200: uploadUrlResponseSchema, 422: errorResponseSchema },
      },
    },
    async (request) =>
      mediaService.createUpload(
        request.auth.userId,
        request.body.purpose,
        request.body.contentType,
      ),
  );
};

export default mediaRoutes;
