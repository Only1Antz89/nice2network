import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireMember } from "@/lib/api";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const querySchema = z.string().trim().min(3).max(100);
const providerSchema = z.object({
  results: z.array(z.object({
    id: z.number(),
    name: z.string(),
    country: z.string(),
    country_code: z.string(),
    timezone: z.string(),
    admin1: z.string().optional(),
    population: z.number().optional(),
  })).optional(),
});

type LocationResult = {
  id: number;
  city: string;
  country: string;
  countryCode: string;
  timezone: string;
  region: string | null;
  label: string;
};
type CachedLocations = { expiresAt: number; results: LocationResult[] };

const cache = new Map<string, CachedLocations>();

function cacheResults(key: string, results: LocationResult[]) {
  if (cache.size >= 500) cache.delete(cache.keys().next().value as string);
  cache.set(key, { results, expiresAt: Date.now() + 24 * 60 * 60_000 });
}

export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    enforceRateLimit(`location-search:${member.id}:${requestIp(request)}`, 60, 10 * 60_000);
    const query = querySchema.parse(request.nextUrl.searchParams.get("q") ?? "");
    const key = query.toLocaleLowerCase("en-GB");
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ results: cached.results });
    }

    const endpoint = new URL(
      process.env.LOCATION_GEOCODING_URL ??
        (process.env.OPEN_METEO_API_KEY
          ? "https://customer-geocoding-api.open-meteo.com/v1/search"
          : "https://geocoding-api.open-meteo.com/v1/search"),
    );
    endpoint.searchParams.set("name", query);
    endpoint.searchParams.set("count", "8");
    endpoint.searchParams.set("language", "en");
    endpoint.searchParams.set("format", "json");
    if (process.env.OPEN_METEO_API_KEY) endpoint.searchParams.set("apikey", process.env.OPEN_METEO_API_KEY);

    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Location provider unavailable");
    const parsed = providerSchema.parse(await response.json());
    const results = (parsed.results ?? [])
      .map<LocationResult>((result) => {
        const region = result.admin1?.trim() || null;
        const parts = [result.name, region && region !== result.name ? region : null, result.country].filter(Boolean);
        return {
          id: result.id,
          city: result.name,
          country: result.country,
          countryCode: result.country_code.toUpperCase(),
          timezone: result.timezone,
          region,
          label: parts.join(", "),
        };
      })
      .filter((result) => result.city && result.country && result.timezone);
    cacheResults(key, results);
    return NextResponse.json({ results }, { headers: { "cache-control": "private, max-age=3600" } });
  } catch (error) {
    return apiError(error);
  }
}
