import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useRouter } from 'expo-router';
import { userEvent } from '@testing-library/react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { useState, type ReactNode } from 'react';
import { Pressable, Text } from 'react-native';

import { useReplaceWhen } from '@/hooks/useReplaceWhen';

/**
 * Mirrors the real routing: the tabs only exist while `me` has a pet (<Stack.Protected>),
 * like src/app/_layout.tsx. Regression test for "the pet is saved but onboarding stays put".
 */
const ME = ['me'];
type Me = { pets: string[] };

const useMe = () => useQuery<Me>({ queryKey: ME, queryFn: async () => ({ pets: [] }) });

function RootLayout() {
  const me = useMe();
  if (!me.data) return null;
  return (
    <Stack>
      <Stack.Screen name="index" />
      <Stack.Screen name="create-pet" />
      <Stack.Protected guard={me.data.pets.length > 0}>
        <Stack.Screen name="discover" />
      </Stack.Protected>
    </Stack>
  );
}

function Index() {
  const me = useMe();
  if (!me.data) return null;
  return <Redirect href={me.data.pets.length ? '/discover' : '/create-pet'} />;
}

type Strategy = 'immediate' | 'replaceWhen';

const createPetScreen = (strategy: Strategy) =>
  function CreatePet() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const me = useMe();
    const [saved, setSaved] = useState(false);
    useReplaceWhen(
      strategy === 'replaceWhen' && saved && Boolean(me.data?.pets.length),
      '/discover',
    );
    const save = () => {
      queryClient.setQueryData<Me>(ME, { pets: ['thor'] });
      if (strategy === 'immediate') router.replace('/discover');
      else setSaved(true);
    };
    return (
      <Pressable onPress={save}>
        <Text>Salvar pet</Text>
      </Pressable>
    );
  };

const saveFirstPet = async (strategy: Strategy) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const result = renderRouter(
    {
      _layout: RootLayout,
      index: Index,
      'create-pet': createPetScreen(strategy),
      discover: () => <Text>Home</Text>,
    },
    { initialUrl: '/', wrapper },
  );
  await result;
  await screen.findByText('Salvar pet');
  await userEvent.setup().press(screen.getByText('Salvar pet'));
  // The router renderer uses fake timers: run pending timers and let renders settle.
  for (let i = 0; i < 5; i++) await act(async () => jest.runOnlyPendingTimers());
  return result.getPathname();
};

describe('onboarding navigation after saving the first pet', () => {
  it('reaches the tabs once the guard sees the pet (useReplaceWhen)', async () => {
    expect(await saveFirstPet('replaceWhen')).toBe('/discover');
  });

  it('documents the cause: replacing in the same tick is cancelled by the guard', async () => {
    // If this starts passing, Expo Router changed and useReplaceWhen may no longer be needed.
    expect(await saveFirstPet('immediate')).toBe('/create-pet');
  });
});
