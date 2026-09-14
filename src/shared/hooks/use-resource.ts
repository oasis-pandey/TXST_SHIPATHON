import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

function errorMessage(cause: unknown) {
  // Supabase database errors are plain objects, not always Error instances.
  if (cause && typeof cause === 'object' && 'message' in cause &&
      typeof cause.message === 'string') return cause.message;
  return 'Unable to load teams. Check your connection and try again.';
}

export function useResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useFocusEffect(useCallback(() => {
    let active = true;

    setLoading(true);
    setError(null);

    loader()
      .then((value) => {
        if (active) setData(value);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(errorMessage(cause));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loader]));

  return { data, error, loading, refresh };
}
