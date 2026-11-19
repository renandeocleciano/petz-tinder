import { z } from 'zod';

import { BUCKETS, IMAGE_CONTENT_TYPES } from './media.types.js';

const purposes = Object.keys(BUCKETS) as [keyof typeof BUCKETS, ...(keyof typeof BUCKETS)[]];
const contentTypes = Object.keys(IMAGE_CONTENT_TYPES) as [
  keyof typeof IMAGE_CONTENT_TYPES,
  ...(keyof typeof IMAGE_CONTENT_TYPES)[],
];

export const uploadUrlBodySchema = z
  .object({ purpose: z.enum(purposes), contentType: z.enum(contentTypes) })
  .strict();

export const uploadUrlResponseSchema = z.object({
  bucket: z.string(),
  path: z.string(),
  uploadUrl: z.url(),
  token: z.string(),
  expiresInSeconds: z.number().int(),
});

/** Object path returned by POST /v1/media/upload-url. */
export const storagePathSchema = z.string().min(1).max(200);
