import { useCallback, useRef, useState } from "react";

import {
  likeDeveloper,
  type LikeDeveloperResult,
} from "@/matching/data-access/matching-service";

export function useLikeDeveloper() {
  const inFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLike = useCallback(
    async (targetUserId: string): Promise<LikeDeveloperResult | null> => {
      if (inFlight.current) return null;

      inFlight.current = true;
      setIsSubmitting(true);
      setError(null);

      try {
        return await likeDeveloper(targetUserId);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to save your Like right now.",
        );
        return null;
      } finally {
        inFlight.current = false;
        setIsSubmitting(false);
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    clearError,
    error,
    isSubmitting,
    submitLike,
  };
}
