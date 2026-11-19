import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';

/**
 * Replaces the current route once `ready` is true, one tick after the render that made it
 * true. Needed when the target sits behind <Stack.Protected>: the guard only takes effect
 * after the navigator's own effects run, and those run *after* this screen's effects (child
 * before parent). Navigating earlier is silently cancelled by Expo Router.
 */
export const useReplaceWhen = (ready: boolean, href: Href) => {
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => router.replace(href), 0);
    return () => clearTimeout(timer);
  }, [ready, href, router]);
};
