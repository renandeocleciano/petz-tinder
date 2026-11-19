import type { LIKE_TYPES } from '../../database/schema/index.js';

export type LikeType = (typeof LIKE_TYPES)[number];

export const POSITIVE_LIKES: ReadonlySet<LikeType> = new Set(['like', 'super_like']);

/** Outbox event written in the match transaction. */
export const MATCH_CREATED = 'MatchCreated';
