import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";

type ErrorCode =
  | "authentication_required"
  | "invalid_request"
  | "method_not_allowed"
  | "self_swipe"
  | "swipe_failed"
  | "target_not_found";

type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

type SuccessResponse = {
  data: {
    swipeId: string;
    targetUserId: string;
    decision: "like";
    createdAt: string;
    matched: boolean;
    matchCreated: boolean;
    matchId: string | null;
  };
};

type AtomicLikeRow = {
  swipe_id: string;
  target_user_id: string;
  decision: "like";
  created_at: string;
  matched: boolean;
  match_created: boolean;
  match_id: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: ErrorResponse | SuccessResponse, status: number) {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

function errorResponse(code: ErrorCode, message: string, status: number) {
  return jsonResponse({ error: { code, message } }, status);
}

function isAtomicLikeRow(value: unknown): value is AtomicLikeRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const row = value as Record<string, unknown>;
  return (
    typeof row.swipe_id === "string" &&
    typeof row.target_user_id === "string" &&
    row.decision === "like" &&
    typeof row.created_at === "string" &&
    typeof row.matched === "boolean" &&
    typeof row.match_created === "boolean" &&
    (typeof row.match_id === "string" || row.match_id === null)
  );
}

function getPublishableKey() {
  const directKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY");
  if (directKey) return directKey;

  const namedKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!namedKeys) return undefined;

  try {
    const keys = JSON.parse(namedKeys) as Record<string, string>;
    return keys.default ?? Object.values(keys)[0];
  } catch {
    return undefined;
  }
}

function createRequestClient(authorization: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = getPublishableKey();
  if (!url || !key) {
    throw new Error("Supabase function environment is not configured.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: authorization },
    },
  });
}

async function readRequestBody(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: "Request body must be valid JSON." } as const;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." } as const;
  }

  const { targetUserId, decision } = body as Record<string, unknown>;
  if (decision !== "like") {
    return { error: 'Decision must be "like".' } as const;
  }
  if (typeof targetUserId !== "string" || !uuidPattern.test(targetUserId)) {
    return { error: "Target user ID must be a valid UUID." } as const;
  }

  return { targetUserId, decision } as const;
}

async function persistLike(
  client: SupabaseClient,
  targetUserId: string,
) {
  const { data: result, error: workflowError } = await client
    .rpc("create_user_like_and_match", {
      p_target_user_id: targetUserId,
    })
    .single();

  if (workflowError) {
    console.error("create-swipe workflow failed", {
      code: workflowError.code,
      message: workflowError.message,
    });

    if (workflowError.message.includes("Target profile does not exist")) {
      return errorResponse(
        "target_not_found",
        "That developer profile is no longer available.",
        404,
      );
    }
    if (workflowError.message.includes("Authentication is required")) {
      return errorResponse(
        "authentication_required",
        "Your session has expired. Sign in and try again.",
        401,
      );
    }
    if (workflowError.message.includes("You cannot Like your own developer profile")) {
      return errorResponse(
        "self_swipe",
        "You cannot Like your own developer profile.",
        400,
      );
    }

    const status = workflowError.code === "42501" ? 403 : 500;
    return errorResponse(
      "swipe_failed",
      status === 403
        ? "You do not have permission to Like this developer."
        : "Unable to save your Like right now.",
      status,
    );
  }

  if (!isAtomicLikeRow(result)) {
    console.error("create-swipe workflow returned an invalid result");
    return errorResponse(
      "swipe_failed",
      "Unable to save your Like right now.",
      500,
    );
  }

  const swipe = result;
  return jsonResponse(
    {
      data: {
        swipeId: swipe.swipe_id,
        targetUserId: swipe.target_user_id,
        decision: "like",
        createdAt: swipe.created_at,
        matched: swipe.matched,
        matchCreated: swipe.match_created,
        matchId: swipe.match_id,
      },
    },
    200,
  );
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return errorResponse(
      "method_not_allowed",
      "Only POST requests are supported.",
      405,
    );
  }

  const authorization = request.headers.get("Authorization");
  const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = tokenMatch?.[1];
  if (!authorization || !token) {
    return errorResponse(
      "authentication_required",
      "Sign in before Liking a developer.",
      401,
    );
  }
  const parsedBody = await readRequestBody(request);
  if ("error" in parsedBody) {
    return errorResponse("invalid_request", parsedBody.error, 400);
  }

  let client: SupabaseClient;
  try {
    client = createRequestClient(authorization);
  } catch (cause) {
    console.error("create-swipe client setup failed", cause);
    return errorResponse(
      "swipe_failed",
      "Unable to save your Like right now.",
      500,
    );
  }

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser(token);
  if (authError || !user) {
    return errorResponse(
      "authentication_required",
      "Your session has expired. Sign in and try again.",
      401,
    );
  }
  if (user.id === parsedBody.targetUserId) {
    return errorResponse(
      "self_swipe",
      "You cannot Like your own developer profile.",
      400,
    );
  }

  return persistLike(client, parsedBody.targetUserId);
});
