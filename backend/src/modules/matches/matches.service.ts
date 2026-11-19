import { z } from 'zod';

import { decodeCursor, encodeCursor } from '../../shared/utils/cursor.js';
import type { MediaService } from '../media/media.service.js';
import { PetForbiddenError, PetNotFoundError } from '../pets/pets.errors.js';
import { createPetPresenter } from '../pets/pets.presenter.js';
import type { PetsRepository } from '../pets/pets.repository.js';
import { MatchNotFoundError } from './matches.errors.js';
import type { MatchesRepository } from './matches.repository.js';
import type { ListMatchesQueryInput, MatchDto } from './matches.schemas.js';
import type { MatchView } from './matches.types.js';

interface Deps {
  repository: MatchesRepository;
  petsRepository: PetsRepository;
  media: MediaService;
  now?: () => Date;
}

const cursorSchema = z.tuple([z.string().min(1).max(64), z.uuid()]);

export const createMatchesService = ({
  repository,
  petsRepository,
  media,
  now = () => new Date(),
}: Deps) => {
  const present = createPetPresenter({ publicUrl: media.publicUrl, now });

  const toDtos = async (views: MatchView[]): Promise<MatchDto[]> => {
    const records = await petsRepository.findByIds(views.map((view) => view.otherPetId));
    const pets = new Map((await petsRepository.hydrate(records)).map((pet) => [pet.id, pet]));
    return views.flatMap((view) => {
      const pet = pets.get(view.otherPetId);
      if (!pet) return [];
      return [
        {
          id: view.id,
          conversationId: view.conversationId,
          myPetId: view.myPetId,
          pet: present(pet),
          isNew: view.lastMessageAt === null,
          createdAt: view.createdAt.toISOString(),
        },
      ];
    });
  };

  const findVisible = async (userId: string, matchId: string) => {
    const view = await repository.findForUser(userId, matchId);
    if (!view) throw new MatchNotFoundError();
    return view;
  };

  return {
    async list(
      userId: string,
      { petId, cursor, limit }: ListMatchesQueryInput,
    ): Promise<{ data: MatchDto[]; nextCursor: string | null }> {
      const after = cursor ? decodeCursor(cursorSchema, cursor) : undefined;
      if (petId) {
        const pet = await petsRepository.findById(petId);
        if (!pet) throw new PetNotFoundError();
        if (pet.ownerId !== userId) throw new PetForbiddenError();
      }
      const views = await repository.listForUser({
        userId,
        petId,
        after: after && { createdAt: after[0], id: after[1] },
        limit: limit + 1,
      });
      const page = views.slice(0, limit);
      const last = page.at(-1);
      return {
        data: await toDtos(page),
        nextCursor:
          views.length > limit && last ? encodeCursor([last.createdAtExact, last.id]) : null,
      };
    },

    async get(userId: string, matchId: string): Promise<MatchDto> {
      const [dto] = await toDtos([await findVisible(userId, matchId)]);
      if (!dto) throw new MatchNotFoundError();
      return dto;
    },

    async unmatch(userId: string, matchId: string): Promise<void> {
      await repository.unmatch(await findVisible(userId, matchId));
    },
  };
};

export type MatchesService = ReturnType<typeof createMatchesService>;
