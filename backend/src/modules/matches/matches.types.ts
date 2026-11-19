/** A match seen from one user's side. */
export interface MatchView {
  id: string;
  /** Exact Postgres timestamp as text, used for cursors (JS Dates drop microseconds). */
  createdAtExact: string;
  createdAt: Date;
  conversationId: string;
  myPetId: string;
  otherPetId: string;
  lastMessageAt: Date | null;
}

export interface MatchCursor {
  createdAt: string;
  id: string;
}

export interface ListMatchesQuery {
  userId: string;
  petId?: string | undefined;
  after?: MatchCursor | undefined;
  limit: number;
}
