import type { EntitlementsService } from '../entitlements/entitlements.service.js';
import type { MatchesService } from '../matches/matches.service.js';
import { PetForbiddenError, PetNotFoundError, PetSuspendedError } from '../pets/pets.errors.js';
import type { PetsRepository } from '../pets/pets.repository.js';
import { AlreadyMatchedError, OwnPetLikeError, SuperLikeLimitError } from './likes.errors.js';
import { orderedPair, type LikesRepository } from './likes.repository.js';
import type { CreateLikeBody, LikeResponse } from './likes.schemas.js';
import { MATCH_CREATED, POSITIVE_LIKES } from './likes.types.js';

interface Deps {
  repository: LikesRepository;
  petsRepository: PetsRepository;
  matches: MatchesService;
  entitlements: EntitlementsService;
  now?: () => Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const createLikesService = ({
  repository,
  petsRepository,
  matches,
  entitlements,
  now = () => new Date(),
}: Deps) => ({
  /**
   * Records a swipe. A positive swipe answering a positive swipe creates the match, its
   * conversation and a MatchCreated outbox event in the same transaction.
   */
  async create(
    userId: string,
    { fromPetId, toPetId, type }: CreateLikeBody,
  ): Promise<LikeResponse> {
    const from = await petsRepository.findById(fromPetId);
    if (!from) throw new PetNotFoundError();
    if (from.ownerId !== userId) throw new PetForbiddenError();
    if (from.status === 'suspended') throw new PetSuspendedError();

    const to = await petsRepository.findById(toPetId);
    if (!to || to.status !== 'active') throw new PetNotFoundError();
    if (to.ownerId === userId) throw new OwnPetLikeError();

    const superLikeLimit =
      type === 'super_like' ? await entitlements.superLikesPerDay(userId) : null;

    const result = await repository.transaction(async (tx) => {
      // Blocked users look like missing pets: the blocker's existence is not revealed.
      if (await tx.areBlocked(userId, to.ownerId)) throw new PetNotFoundError();
      // Lock order is always user → pair, so concurrent swipes cannot deadlock.
      if (type === 'super_like') await tx.lock(`super-like:${userId}`);
      // Serializes both sides of the pair: two simultaneous likes still produce the match.
      await tx.lock(`pair:${orderedPair(fromPetId, toPetId).join(':')}`);

      if (await tx.findMatchId(fromPetId, toPetId)) throw new AlreadyMatchedError();

      const existing = await tx.findLike(fromPetId, toPetId);
      if (existing?.type === type) return { like: existing, matchId: null };

      if (superLikeLimit !== null) {
        const used = await tx.countSuperLikesSince(userId, new Date(now().getTime() - DAY_MS));
        if (used >= superLikeLimit) throw new SuperLikeLimitError(superLikeLimit);
      }

      const like = await tx.upsertLike(fromPetId, toPetId, type);
      if (!POSITIVE_LIKES.has(type)) return { like, matchId: null };

      const reverse = await tx.findLike(toPetId, fromPetId);
      if (!reverse || !POSITIVE_LIKES.has(reverse.type)) return { like, matchId: null };

      const { matchId, conversationId } = await tx.createMatch([
        { petId: fromPetId, userId },
        { petId: toPetId, userId: to.ownerId },
      ]);
      await tx.enqueueEvent(MATCH_CREATED, {
        matchId,
        conversationId,
        petIds: [fromPetId, toPetId],
        userIds: [userId, to.ownerId],
      });
      return { like, matchId };
    });

    const { like } = result;
    return {
      like: {
        id: like.id,
        fromPetId: like.fromPetId,
        toPetId: like.toPetId,
        type: like.type,
        createdAt: like.updatedAt.toISOString(),
      },
      match: result.matchId ? await matches.get(userId, result.matchId) : null,
    };
  },
});

export type LikesService = ReturnType<typeof createLikesService>;
