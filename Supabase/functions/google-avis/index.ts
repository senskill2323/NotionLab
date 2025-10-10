import { corsHeaders } from "./cors.ts";

const GOOGLE_PLACES_API_KEY =
  Deno.env.get("GOOGLE_PLACES_API_KEY") ?? Deno.env.get("GOOGLE_MAPS_API_KEY") ?? "";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const CACHE_NAMESPACE = ["google-avis", "v1"];

const kvPromise = (async () => {
  try {
    return await Deno.openKv();
  } catch (error) {
    console.warn("KV storage is not available for google-avis cache:", error);
    return null;
  }
})();

const createJsonResponse = (
  payload: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });

const clampLimit = (value: unknown, min = 1, max = 10) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
};

const sanitizeReview = (raw: Record<string, unknown>, fallbackLocale: string) => {
  const rating = Number(raw.rating ?? 0);
  const time = Number(raw.time ?? 0);
  const createdAt =
    Number.isFinite(time) && time > 0
      ? time
      : Math.floor(Date.now() / 1000);

  return {
    id:
      typeof raw.review_id === "string" && raw.review_id.trim().length > 0
        ? raw.review_id.trim()
        : typeof raw.author_name === "string" && raw.author_name.trim().length > 0
          ? `${raw.author_name.trim()}-${createdAt}`
          : crypto.randomUUID(),
    authorName:
      typeof raw.author_name === "string" && raw.author_name.trim().length > 0
        ? raw.author_name.trim()
        : "Client Google",
    authorUrl:
      typeof raw.author_url === "string" && raw.author_url.trim().length > 0
        ? raw.author_url.trim()
        : null,
    profilePhotoUrl:
      typeof raw.profile_photo_url === "string" && raw.profile_photo_url.trim().length > 0
        ? raw.profile_photo_url.trim()
        : null,
    rating: Number.isFinite(rating) ? rating : null,
    text:
      typeof raw.text === "string" && raw.text.trim().length > 0
        ? raw.text.trim()
        : "",
    relativeTimeDescription:
      typeof raw.relative_time_description === "string" &&
      raw.relative_time_description.trim().length > 0
        ? raw.relative_time_description.trim()
        : null,
    time: createdAt,
    locale: fallbackLocale,
  };
};

const fetchFromGoogle = async ({
  placeId,
  limit,
  locale,
}: {
  placeId: string;
  limit: number;
  locale: string;
}) => {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY configuration");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,rating,user_ratings_total,reviews,url");
  url.searchParams.set("reviews_no_translations", "false");
  url.searchParams.set("language", locale);
  url.searchParams.set("key", GOOGLE_PLACES_API_KEY);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const reason = await response.text().catch(() => response.statusText);
    throw new Error(`Google Places API error (${response.status}): ${reason}`);
  }

  const payload = await response.json();
  if (!payload || payload.status !== "OK") {
    const status = typeof payload?.status === "string" ? payload.status : "UNKNOWN_ERROR";
    const message =
      typeof payload?.error_message === "string"
        ? payload.error_message
        : "Google Places API returned an error status";
    throw new Error(`Google Places API status ${status}: ${message}`);
  }

  const result = payload.result ?? {};
  const rawReviews = Array.isArray(result.reviews) ? result.reviews : [];
  const sanitizedReviews = rawReviews
    .slice(0, limit)
    .map((item: Record<string, unknown>) => sanitizeReview(item, locale));

  const metadata = {
    name:
      typeof result.name === "string" && result.name.trim().length > 0
        ? result.name.trim()
        : null,
    averageRating:
      typeof result.rating === "number" && Number.isFinite(result.rating)
        ? Number(result.rating)
        : null,
    totalReviews:
      typeof result.user_ratings_total === "number" &&
      Number.isFinite(result.user_ratings_total)
        ? Number(result.user_ratings_total)
        : null,
    googleUrl:
      typeof result.url === "string" && result.url.trim().length > 0
        ? result.url.trim()
        : null,
  };

  return {
    reviews: sanitizedReviews,
    metadata,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return createJsonResponse(
      { error: "Only POST method is allowed." },
      405,
      { Allow: "POST, OPTIONS" },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return createJsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  const placeId =
    typeof body.placeId === "string" ? body.placeId.trim() : "";
  if (!placeId) {
    return createJsonResponse({ error: "The placeId field is required." }, 400);
  }

  const limit = clampLimit(body.limit, 1, 10);
  const localeRaw =
    typeof body.locale === "string" && body.locale.trim().length > 0
      ? body.locale.trim().toLowerCase()
      : "fr";
  const locale = localeRaw.replace(/[^a-z-]/gi, "") || "fr";

  const cacheKey = [...CACHE_NAMESPACE, placeId, locale, String(limit)];
  const kv = await kvPromise;

  if (kv) {
    try {
      const cached = await kv.get<{ timestamp: number; data: unknown }>(cacheKey);
      if (cached?.value) {
        const isFresh = Date.now() - cached.value.timestamp < CACHE_TTL_MS;
        if (isFresh) {
          return createJsonResponse(
            { ...(cached.value.data as Record<string, unknown>), cached: true },
            200,
            { "Cache-Control": "public, max-age=600" },
          );
        }
      }
    } catch (error) {
      console.warn("Unable to read google-avis cache:", error);
    }
  }

  try {
    const freshData = await fetchFromGoogle({ placeId, limit, locale });

    if (kv) {
      try {
        await kv.set(
          cacheKey,
          { timestamp: Date.now(), data: freshData },
          { expireIn: CACHE_TTL_MS },
        );
      } catch (error) {
        console.warn("Unable to store google-avis cache:", error);
      }
    }

    return createJsonResponse(
      { ...freshData, cached: false },
      200,
      { "Cache-Control": "public, max-age=600" },
    );
  } catch (error) {
    console.error("google-avis function error:", error);
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return createJsonResponse({ error: message }, 502);
  }
});
