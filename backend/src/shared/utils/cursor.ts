import type { z } from 'zod';

import { ValidationError } from '../errors/index.js';

/** Opaque cursors: base64url JSON, validated on the way back in. */
export const encodeCursor = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export const decodeCursor = <T extends z.ZodType>(schema: T, cursor: string): z.output<T> => {
  try {
    return schema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString()));
  } catch {
    throw new ValidationError('Cursor inválido');
  }
};
