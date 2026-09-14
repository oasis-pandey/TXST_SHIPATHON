import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const PLACEHOLDER_QUEUE_SIZE = 10;

type TeamCandidate = {
  id: string;
  name: string;
  description: string | null;
  project_idea: string | null;
  repo_url: string | null;
  tech_stack: string[];
  max_members: number;
  created_at: string;
  updated_at: string;
};

function chooseRandomCandidates(candidates: TeamCandidate[]) {
  return [...candidates]
    .sort(() => Math.random() - 0.5)
    .slice(0, PLACEHOLDER_QUEUE_SIZE);
}

export default {
  fetch: withSupabase({ auth: "user" }, async (_request, ctx) => {
    const actorId = ctx.userClaims?.id;
    if (!actorId) {
      return Response.json({ error: "Authenticated user is required." }, { status: 401 });
    }

    // Placeholder only: replace this random selection with the recommendation
    // algorithm once its inputs and ranking contract are defined.
    const { data: teams, error: teamsError } = await ctx.supabaseAdmin
      .from("teams")
      .select(
        "id, name, description, project_idea, repo_url, tech_stack, max_members, created_at, updated_at",
      );

    if (teamsError) {
      console.error("Could not load team queue candidates", teamsError);
      return Response.json({ error: "Could not load team queue candidates." }, { status: 500 });
    }

    const candidates = chooseRandomCandidates((teams ?? []) as TeamCandidate[]);
    if (!candidates.length) {
      return Response.json({ added: 0, recommendations: [] });
    }

    const { error: queueError } = await ctx.supabaseAdmin
      .from("recommendation_queue")
      .upsert(
        candidates.map((candidate) => ({
          actor_type: "user",
          actor_id: actorId,
          target_type: "team",
          target_id: candidate.id,
          score: 0,
          created_by_user_id: actorId,
        })),
        { onConflict: "actor_type,actor_id,target_type,target_id" },
      );

    if (queueError) {
      console.error("Could not populate team recommendation queue", queueError);
      return Response.json({ error: "Could not populate team recommendation queue." }, { status: 500 });
    }

    return Response.json({ added: candidates.length, recommendations: candidates });
  }),
};
