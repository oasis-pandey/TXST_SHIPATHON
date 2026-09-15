import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PLACEHOLDER_QUEUE_SIZE = 10;

type Candidate = {
  id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  github_url: string | null;
  skill_level: string | null;
  availability: string | null;
  discovery_mode: "people" | "teams" | "both";
  tech_stack: string[];
  interests: string[];
  preferred_roles: string[];
  created_at: string;
  updated_at: string;
};

function chooseRandomCandidates(candidates: Candidate[]) {
  return [...candidates]
    .sort(() => Math.random() - 0.5)
    .slice(0, PLACEHOLDER_QUEUE_SIZE);
}

export function excludeDecidedCandidates(
  candidates: Candidate[],
  decidedTargetIds: string[],
) {
  const decidedProfileIds = new Set(decidedTargetIds);
  return candidates.filter((profile) => !decidedProfileIds.has(profile.id));
}

export default {
  fetch: withSupabase({ auth: "user" }, async (_request, ctx) => {
    const actorId = ctx.userClaims?.id;
    if (!actorId) {
      return Response.json({ error: "Authenticated user is required." }, { status: 401 });
    }

    // Placeholder only: replace this random selection with the recommendation
    // algorithm once its inputs and ranking contract are defined.
    const { data: decidedSwipes, error: swipesError } = await ctx.supabaseAdmin
      .from("swipes")
      .select("target_id")
      .eq("actor_type", "user")
      .eq("actor_id", actorId)
      .eq("target_type", "user");

    if (swipesError) {
      console.error("Could not load decided profiles", swipesError);
      return Response.json({ error: "Could not load queue candidates." }, { status: 500 });
    }

    const { data: profiles, error: profilesError } = await ctx.supabaseAdmin
      .from("profiles")
      .select(
        "id, display_name, bio, avatar_url, github_url, skill_level, availability, discovery_mode, tech_stack, interests, preferred_roles, created_at, updated_at",
      )
      .neq("id", actorId);

    if (profilesError) {
      console.error("Could not load queue candidates", profilesError);
      return Response.json({ error: "Could not load queue candidates." }, { status: 500 });
    }

    const eligibleProfiles = excludeDecidedCandidates(
      (profiles ?? []) as Candidate[],
      (decidedSwipes ?? []).map((swipe) => swipe.target_id),
    );
    const candidates = chooseRandomCandidates(eligibleProfiles);
    if (!candidates.length) {
      return Response.json({ added: 0, recommendations: [] });
    }

    const { error: queueError } = await ctx.supabaseAdmin
      .from("recommendation_queue")
      .upsert(
        candidates.map((candidate) => ({
          actor_type: "user",
          actor_id: actorId,
          target_type: "user",
          target_id: candidate.id,
          score: 0,
          created_by_user_id: actorId,
        })),
        {
          onConflict: "actor_type,actor_id,target_type,target_id",
        },
      );

    if (queueError) {
      console.error("Could not populate recommendation queue", queueError);
      return Response.json({ error: "Could not populate recommendation queue." }, { status: 500 });
    }

    return Response.json({ added: candidates.length, recommendations: candidates });
  }),
};
