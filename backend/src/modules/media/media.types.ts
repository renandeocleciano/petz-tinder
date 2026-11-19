export const BUCKETS = {
  pet_photo: 'pet-photos',
  user_avatar: 'user-avatars',
  chat_media: 'chat-media',
} as const;

export type MediaPurpose = keyof typeof BUCKETS;
export type Bucket = (typeof BUCKETS)[MediaPurpose];

export const IMAGE_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
} as const;

export type ImageContentType = keyof typeof IMAGE_CONTENT_TYPES;

/** Object storage operations the domain needs. Implemented by Supabase Storage. */
export interface StorageService {
  createUploadUrl(bucket: Bucket, path: string): Promise<{ uploadUrl: string; token: string }>;
  exists(bucket: Bucket, path: string): Promise<boolean>;
  publicUrl(bucket: Bucket, path: string): string;
  /** Temporary read URLs for private buckets, keyed by path. Missing objects are omitted. */
  signedUrls(
    bucket: Bucket,
    paths: string[],
    expiresInSeconds: number,
  ): Promise<Map<string, string>>;
  remove(bucket: Bucket, paths: string[]): Promise<void>;
  /** Deletes every object under `prefix/` (used on account deletion). */
  removeFolder(bucket: Bucket, prefix: string): Promise<void>;
}
