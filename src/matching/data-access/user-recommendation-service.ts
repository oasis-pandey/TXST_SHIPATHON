import { getSupabase } from "@/shared/lib/supabase";

import type { UserRecommendationProfile } from "./profile-queue";

type PopulateQueueResponse = {
  recommendations?: unknown;
};

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isRecommendationProfile(value: unknown): value is UserRecommendationProfile {
  if (!value || typeof value !== "object") return false;

  const profile = value as Record<string, unknown>;
  return (
    typeof profile.id === "string" &&
    typeof profile.display_name === "string" &&
    (profile.bio === null || typeof profile.bio === "string") &&
    (profile.avatar_url === null || typeof profile.avatar_url === "string") &&
    (profile.github_url === null || typeof profile.github_url === "string") &&
    (profile.skill_level === null || typeof profile.skill_level === "string") &&
    (profile.availability === null || typeof profile.availability === "string") &&
    (profile.discovery_mode === "people" ||
      profile.discovery_mode === "teams" ||
      profile.discovery_mode === "both") &&
    typeof profile.created_at === "string" &&
    typeof profile.updated_at === "string"
  );
}

function normalizeProfile(value: unknown): UserRecommendationProfile | undefined {
  if (!isRecommendationProfile(value)) return undefined;

  return {
    ...value,
    tech_stack: asStringArray((value as Record<string, unknown>).tech_stack),
    interests: asStringArray((value as Record<string, unknown>).interests),
    preferred_roles: asStringArray((value as Record<string, unknown>).preferred_roles),
  };
}

export async function requestUserRecommendations() {
  const { data, error } = await getSupabase().functions.invoke<PopulateQueueResponse>(
    "populate-user-recommendation-queue",
    { method: "POST" },
  );

  if (error) throw new Error("Could not load recommendations. Please try again.");

  const recommendations = Array.isArray(data?.recommendations)
    ? data.recommendations.map(normalizeProfile).filter((profile): profile is UserRecommendationProfile => Boolean(profile))
    : [];

  return recommendations;
}
