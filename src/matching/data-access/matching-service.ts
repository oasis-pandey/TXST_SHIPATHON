import { requireSupabase } from "@/shared/lib/supabase";

export type LikeDeveloperResult = {
  swipeId: string;
  targetUserId: string;
  decision: "like";
  createdAt: string;
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
  if (!data?.data) {
    throw new Error("The Like was saved, but the server returned an invalid response.");
  }

  return data.data;
}
