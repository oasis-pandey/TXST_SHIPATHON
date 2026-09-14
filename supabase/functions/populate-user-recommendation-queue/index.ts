import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PLACEHOLDER_QUEUE_SIZE = 10;

type Candidate = { id: string };

function chooseRandomCandidates(candidates: Candidate[]) {
  return [...candidates]
    .sort(() => Math.random() - 0.5)
    .slice(0, PLACEHOLDER_QUEUE_SIZE);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (_request, ctx) => {
    const actorId = ctx.userClaims?.sub;
    if (!actorId) {
      return Response.json({ error: "Authenticated user is required." }, { status: 401 });
    }

    // Placeholder only: replace this random selection with the recommendation
    // algorithm once its inputs and ranking contract are defined.
    const { data: profiles, error: profilesError } = await ctx.supabaseAdmin
      .from("profiles")
      .select("id")
      .neq("id", actorId);

    if (profilesError) {
      return Response.json({ error: "Could not load queue candidates." }, { status: 500 });
    }

    const candidates = chooseRandomCandidates((profiles ?? []) as Candidate[]);
    if (!candidates.length) {
      return Response.json({ added: 0 });
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
      return Response.json({ error: "Could not populate recommendation queue." }, { status: 500 });
    }

    return Response.json({ added: candidates.length });
  }),
};
