import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useInboxRealtime } from '@/hooks/useInboxRealtime';
import { useMe } from '@/hooks/useMe';
import { createQueryClient } from '@/lib/queryClient';
import { AuthProvider, useAuthSession } from '@/services/auth';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isLoaded, isSignedIn } = useAuthSession();
  const me = useMe(isSignedIn);
  const hasPet = (me.data?.pets.length ?? 0) > 0;
  const ready = isLoaded && (!isSignedIn || !me.isLoading);
  // Live chat for the whole session (also while a conversation is open on top of the tabs).
  useInboxRealtime(isSignedIn ? me.data?.user.id : undefined);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Protected guard={hasPet}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="conversation/[id]" />
          <Stack.Screen name="pet/[id]/index" />
          <Stack.Screen name="pet/[id]/edit" />
          <Stack.Screen name="premium" options={{ presentation: 'modal' }} />
          <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
