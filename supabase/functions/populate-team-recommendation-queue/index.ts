import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const QUEUE_SIZE = 10;

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

export default {
  fetch: withSupabase({ auth: "user" }, async (_request, ctx) => {
    const actorId = ctx.userClaims?.id;
    if (!actorId) {
      return Response.json({ error: "Authenticated user is required." }, { status: 401 });
    }

    const [{ data: memberships, error: membershipsError }, { data: teams, error: teamsError }] =
      await Promise.all([
        ctx.supabaseAdmin.from("team_members").select("team_id").eq("user_id", actorId),
        ctx.supabaseAdmin.from("teams").select(
          "id, name, description, project_idea, repo_url, tech_stack, max_members, created_at, updated_at",
        ),
      ]);
    if (membershipsError || teamsError) {
      console.error("Could not load team recommendation candidates", membershipsError ?? teamsError);
      return Response.json({ error: "Could not load team recommendations." }, { status: 500 });
    }

    const memberTeamIds = new Set((memberships ?? []).map((membership) => membership.team_id));
    const recommendations = [...((teams ?? []) as TeamCandidate[])]
      .filter((team) => !memberTeamIds.has(team.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, QUEUE_SIZE);

    return Response.json({ recommendations });
  }),
};
