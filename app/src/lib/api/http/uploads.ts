import { File } from 'expo-file-system';

import { ApiError } from '../errors';
import type { Request } from './client';
import type { MediaPurpose, UploadUrlDto } from './contract';

/** Picker results are local (`file://`, `content://`, `ph://`…); uploaded photos are http(s). */
export const isLocalUri = (uri: string) => !/^https?:\/\//i.test(uri);

const ascii = (bytes: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...bytes.slice(start, end));

/**
 * Image type from the file signature, not the extension. Returns null when the bytes are not
 * an image the backend accepts — e.g. an error text from a failed read.
 */
export const detectImageType = (bytes: Uint8Array): string | null => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (ascii(bytes, 0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp';
  if (ascii(bytes, 4, 8) === 'ftyp' && /^(heic|heix|mif1|msf1|hevc)$/.test(ascii(bytes, 8, 12))) {
    return 'image/heic';
  }
  return null;
};

const invalidImage = () =>
  new ApiError(0, 'validation', 'Não foi possível ler a imagem. Escolha outra foto.', {
    serverCode: 'INVALID_LOCAL_IMAGE',
  });

/**
 * Reads a picked image with expo-file-system (handles file:// and Android content:// URIs;
 * `fetch(uri)` does not on Android and returned an error text instead of the photo).
 */
const readImage = async (uri: string) => {
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = new Uint8Array(await new File(uri).arrayBuffer());
  } catch {
    throw invalidImage();
  }
  const contentType = detectImageType(bytes);
  if (!contentType) throw invalidImage();
  return { bytes, contentType };
};

/**
 * Files never go through the API: ask for a signed URL, PUT the file straight to Supabase
 * Storage, and return the `path` to link it to a pet, the avatar or a message.
 */
export const createUploader =
  (request: Request) =>
  async (purpose: MediaPurpose, uri: string): Promise<string> => {
    const { bytes, contentType } = await readImage(uri);
    const upload = await request<UploadUrlDto>('POST', '/media/upload-url', {
      purpose,
      contentType,
    });
    let response: Response;
    try {
      // Raw bytes, not a Blob: expo/fetch replaces Content-Type with the Blob's own type,
      // which is empty for local files, and Storage then rejects the upload.
      response = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: bytes,
      });
    } catch {
      throw new ApiError(0, 'network', 'Network request failed');
    }
    if (!response.ok) {
      // Storage answers `{ error, message }` (e.g. invalid_mime_type); kept for diagnosis.
      const detail = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new ApiError(response.status, 'unknown', 'Não foi possível enviar a imagem.', {
        serverCode: `STORAGE_${(detail?.error ?? 'upload_failed').toUpperCase()}`,
        details: detail,
      });
    }
    return upload.path;
  };

export type Uploader = ReturnType<typeof createUploader>;
