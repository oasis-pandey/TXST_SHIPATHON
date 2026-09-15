import { requireSupabase } from "@/shared/lib/supabase";

export type LikeDeveloperResult = {
  swipeId: string;
  targetUserId: string;
  decision: "like";
  createdAt: string;
  matched: boolean;
  matchCreated: boolean;
  matchId: string | null;
};

type CreateSwipeResponse = {
  data: LikeDeveloperResult;
};

type FunctionErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

function isLikeDeveloperResult(value: unknown): value is LikeDeveloperResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const result = value as Record<string, unknown>;
  return (
    typeof result.swipeId === "string" &&
    typeof result.targetUserId === "string" &&
    result.decision === "like" &&
    typeof result.createdAt === "string" &&
    typeof result.matched === "boolean" &&
    typeof result.matchCreated === "boolean" &&
    (typeof result.matchId === "string" || result.matchId === null) &&
    (!result.matchCreated || result.matched) &&
    (!result.matched || typeof result.matchId === "string")
  );
}

async function getFunctionErrorMessage(cause: unknown) {
  const fallback =
    cause instanceof Error ? cause.message : "Unable to save your Like right now.";
  if (!cause || typeof cause !== "object" || !("context" in cause)) {
    return fallback;
  }

  const context = cause.context;
  if (!(context instanceof Response)) return fallback;

  try {
    const body = (await context.clone().json()) as FunctionErrorBody;
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function likeDeveloper(
  targetUserId: string,
): Promise<LikeDeveloperResult> {
  const { data, error } =
    await requireSupabase().functions.invoke<CreateSwipeResponse>(
      "create-swipe",
      {
        body: {
          targetUserId,
          decision: "like",
        },
      },
    );

  if (error) {
    throw new Error(await getFunctionErrorMessage(error));
  }
  if (!isLikeDeveloperResult(data?.data)) {
    throw new Error("The Like was saved, but the server returned an invalid response.");
  }

  return data.data;
}
