import { randomUUID } from 'node:crypto';

import { ForbiddenError } from '../../shared/errors/index.js';
import { MediaNotFoundError } from './media.errors.js';
import {
  BUCKETS,
  IMAGE_CONTENT_TYPES,
  type Bucket,
  type ImageContentType,
  type MediaPurpose,
  type StorageService,
} from './media.types.js';

/** Supabase signed upload URLs are valid for two hours. */
const UPLOAD_URL_TTL_SECONDS = 2 * 60 * 60;
/** Read URLs for private chat images. Long enough for a chat session, short enough to expire. */
export const SIGNED_READ_TTL_SECONDS = 60 * 60;
const EXTENSIONS = Object.values(IMAGE_CONTENT_TYPES).join('|');
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

export const createMediaService = (storage: StorageService) => ({
  /**
   * Issues a one-off signed upload URL. The path is chosen by the server under the user's
   * own prefix, so a client can never write over someone else's object.
   */
  async createUpload(userId: string, purpose: MediaPurpose, contentType: ImageContentType) {
    const bucket = BUCKETS[purpose];
    const path = `${userId}/${randomUUID()}.${IMAGE_CONTENT_TYPES[contentType]}`;
    const { uploadUrl, token } = await storage.createUploadUrl(bucket, path);
    return { bucket, path, uploadUrl, token, expiresInSeconds: UPLOAD_URL_TTL_SECONDS };
  },

  /** Validates that `path` was issued to this user and the upload actually happened. */
  async assertUploaded(userId: string, bucket: Bucket, path: string): Promise<void> {
    const pattern = new RegExp(`^${userId}/${UUID}\\.(${EXTENSIONS})$`);
    if (!pattern.test(path)) throw new ForbiddenError('Arquivo inválido', 'MEDIA_FORBIDDEN');
    if (!(await storage.exists(bucket, path))) throw new MediaNotFoundError();
  },

  publicUrl: (bucket: Bucket, path: string) => storage.publicUrl(bucket, path),

  signedUrls: (bucket: Bucket, paths: string[]) =>
    storage.signedUrls(bucket, paths, SIGNED_READ_TTL_SECONDS),

  remove: (bucket: Bucket, paths: string[]) => storage.remove(bucket, paths),

  /** Every upload lives under `<userId>/`, so a user's files can be wiped per bucket. */
  async removeAllForUser(userId: string): Promise<void> {
    for (const bucket of Object.values(BUCKETS)) await storage.removeFolder(bucket, userId);
  },
});

export type MediaService = ReturnType<typeof createMediaService>;
