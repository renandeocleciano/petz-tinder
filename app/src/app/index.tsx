import { Redirect } from 'expo-router';

import { useMe } from '@/hooks/useMe';
import { useAuthSession } from '@/services/auth';

/** Entry point: routes to auth, onboarding or the main tabs based on session state. */
export default function Index() {
  const { isSignedIn } = useAuthSession();
  const { data } = useMe(isSignedIn);

  if (!isSignedIn) return <Redirect href="/welcome" />;
  if (!data?.pets.length) return <Redirect href="/create-pet" />;
  return <Redirect href="/discover" />;
}
