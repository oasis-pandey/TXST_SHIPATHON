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
  };
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
  actorUserId: string,
  targetUserId: string,
) {
  const { data: target, error: targetError } = await client
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetError) {
    console.error("create-swipe target lookup failed", {
      code: targetError.code,
      message: targetError.message,
    });
    return errorResponse(
      "swipe_failed",
      "Unable to validate this developer right now.",
      500,
    );
  }
  if (!target) {
    return errorResponse(
      "target_not_found",
      "That developer profile is no longer available.",
      404,
    );
  }

  const { data: swipe, error: swipeError } = await client
    .from("swipes")
    .upsert(
      {
        actor_type: "user",
        actor_id: actorUserId,
        target_type: "user",
        target_id: targetUserId,
        decision: "like",
        created_by_user_id: actorUserId,
        created_at: new Date().toISOString(),
      },
      { onConflict: "actor_type,actor_id,target_type,target_id" },
    )
    .select("id, target_id, decision, created_at")
    .single();

  if (swipeError) {
    console.error("create-swipe upsert failed", {
      code: swipeError.code,
      message: swipeError.message,
    });
    const status = swipeError.code === "42501" ? 403 : 500;
    return errorResponse(
      "swipe_failed",
      status === 403
        ? "You do not have permission to Like this developer."
        : "Unable to save your Like right now.",
      status,
    );
  }

  return jsonResponse(
    {
      data: {
        swipeId: swipe.id,
        targetUserId: swipe.target_id,
        decision: "like",
        createdAt: swipe.created_at,
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

  return persistLike(client, user.id, parsedBody.targetUserId);
});
