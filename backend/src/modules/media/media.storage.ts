import type { SupabaseClient } from '@supabase/supabase-js';

import type { StorageService } from './media.types.js';

export const createSupabaseStorage = (client: SupabaseClient): StorageService => ({
  async createUploadUrl(bucket, path) {
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw error;
    return { uploadUrl: data.signedUrl, token: data.token };
  },

  async exists(bucket, path) {
    const { data, error } = await client.storage.from(bucket).exists(path);
    if (error && !data) return false;
    return data;
  },

  publicUrl(bucket, path) {
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  },

  async signedUrls(bucket, paths, expiresInSeconds) {
    const urls = new Map<string, string>();
    if (paths.length === 0) return urls;
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrls([...new Set(paths)], expiresInSeconds);
    if (error) throw error;
    for (const item of data) {
      if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
    }
    return urls;
  },

  async remove(bucket, paths) {
    if (paths.length === 0) return;
    const { error } = await client.storage.from(bucket).remove(paths);
    if (error) throw error;
  },

  async removeFolder(bucket, prefix) {
    const storage = client.storage.from(bucket);
    for (;;) {
      const { data, error } = await storage.list(prefix, { limit: 100 });
      if (error) throw error;
      if (data.length === 0) return;
      const { error: removeError } = await storage.remove(
        data.map((object) => `${prefix}/${object.name}`),
      );
      if (removeError) throw removeError;
    }
  },
});
