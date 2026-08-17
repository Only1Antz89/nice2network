import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireMember } from "@/lib/api";
import { enforceRateLimit, requestIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const inputSchema = z.object({
  destination: z.string().trim().min(2).max(300),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
}).superRefine((value, context) => {
  if ((value.latitude === undefined) !== (value.longitude === undefined)) {
    context.addIssue({ code: "custom", message: "Provide both origin coordinates" });
  }
});

const geocodeSchema = z.array(z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string().optional(),
}));
const routeSchema = z.object({
  code: z.string(),
  routes: z.array(z.object({ duration: z.number(), distance: z.number() })),
});
type Venue = { latitude: number; longitude: number; displayName: string };
type CachedVenue = Venue & { expiresAt: number };

const venueCache = new Map<string, CachedVenue>();
let geocodeQueue = Promise.resolve();
let lastGeocodeAt = 0;

function cacheVenue(key: string, venue: Venue) {
  if (venueCache.size >= 500) venueCache.delete(venueCache.keys().next().value as string);
  venueCache.set(key, { ...venue, expiresAt: Date.now() + 30 * 24 * 60 * 60_000 });
}

async function geocode(destination: string) {
  const key = destination.toLocaleLowerCase("en-GB");
  const cached = venueCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const task = geocodeQueue.then(async () => {
    const wait = Math.max(0, 1_000 - (Date.now() - lastGeocodeAt));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    const endpoint = new URL(process.env.MAP_GEOCODING_URL ?? "https://nominatim.openstreetmap.org/search");
    endpoint.searchParams.set("q", destination);
    endpoint.searchParams.set("format", "jsonv2");
    endpoint.searchParams.set("limit", "1");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://nice2network.vercel.app";
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        referer: appUrl,
        "user-agent": `nice2network/1.0 (${appUrl})`,
      },
      signal: AbortSignal.timeout(6_000),
    });
    lastGeocodeAt = Date.now();
    if (!response.ok) throw new Error("Venue lookup failed");
    const [match] = geocodeSchema.parse(await response.json());
    if (!match) throw new Error("Venue not found");
    const venue = {
      latitude: Number(match.lat),
      longitude: Number(match.lon),
      displayName: match.display_name ?? destination,
    };
    if (!Number.isFinite(venue.latitude) || !Number.isFinite(venue.longitude)) throw new Error("Invalid venue coordinates");
    cacheVenue(key, venue);
    return venue;
  });
  geocodeQueue = task.then(() => undefined, () => undefined);
  return task;
}

export async function GET(request: NextRequest) {
  try {
    const member = await requireMember();
    enforceRateLimit(`meet-route:${member.id}:${requestIp(request)}`, 30, 10 * 60_000);
    const input = inputSchema.parse({
      destination: request.nextUrl.searchParams.get("destination") ?? "",
      latitude: request.nextUrl.searchParams.get("latitude") ?? undefined,
      longitude: request.nextUrl.searchParams.get("longitude") ?? undefined,
    });
    const venue = await geocode(input.destination);
    if (input.latitude === undefined || input.longitude === undefined) {
      return NextResponse.json({ venue }, { headers: { "cache-control": "private, max-age=3600" } });
    }

    const routingBase = (process.env.MAP_ROUTING_URL ?? "https://router.project-osrm.org/route/v1/driving").replace(/\/$/, "");
    const coordinates = `${input.longitude},${input.latitude};${venue.longitude},${venue.latitude}`;
    const response = await fetch(`${routingBase}/${coordinates}?overview=false&steps=false`, {
      headers: { accept: "application/json", "user-agent": "nice2network/1.0" },
      signal: AbortSignal.timeout(7_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Route lookup failed");
    const result = routeSchema.parse(await response.json());
    const route = result.routes[0];
    if (result.code !== "Ok" || !route) throw new Error("No route found");
    return NextResponse.json({ venue, route: { durationSeconds: route.duration, distanceMeters: route.distance } }, {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
