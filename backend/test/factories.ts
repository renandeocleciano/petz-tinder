import type { App } from '../src/app.js';

export const petBody = (name: string, overrides: Record<string, unknown> = {}) => ({
  name,
  species: 'dog',
  breed: 'SRD',
  approximateAgeYears: 2,
  gender: 'female',
  size: 'small',
  neutered: false,
  city: 'Rio de Janeiro',
  latitude: -22.97,
  longitude: -43.18,
  personalityTraits: ['calm'],
  ...overrides,
});

export const createPet = async (
  app: App,
  headers: Record<string, string>,
  name: string,
  overrides: Record<string, unknown> = {},
) => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/pets',
    headers,
    payload: petBody(name, overrides),
  });
  if (response.statusCode !== 201) throw new Error(`createPet failed: ${response.body}`);
  return response.json().pet.id as string;
};

/** Several pets per account is premium: upgrade the user through the dev route. */
export const upgradeToPremium = async (app: App, headers: Record<string, string>) => {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/dev/subscription',
    headers,
    payload: { tier: 'premium' },
  });
  if (response.statusCode !== 200) throw new Error(`upgrade failed: ${response.body}`);
};
