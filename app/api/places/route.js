import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function normalizeFeature(feature) {
  const place = feature?.properties || {};
  const [longitude, latitude] = feature?.geometry?.coordinates || [];
  const label = [...new Set([
    place.name,
    place.street,
    place.district,
    place.city || place.town || place.village,
    place.state,
    place.country,
  ].filter(Boolean))].join(", ");

  if (!label || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
  return { label, latitude: Number(latitude), longitude: Number(longitude) };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = String(searchParams.get("q") || "").trim();
  if (query.length < 2) return NextResponse.json({ results: [] });

  try {
    const endpoint = new URL("https://photon.komoot.io/api/");
    endpoint.searchParams.set("q", query.slice(0, 180));
    endpoint.searchParams.set("limit", "8");
    endpoint.searchParams.set("lang", "en");
    const response = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "Wayfare place search" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    const payload = await response.json();
    const results = (payload.features || []).map(normalizeFeature).filter(Boolean);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    console.error("Place lookup failed", error);
    return NextResponse.json({ results: [], error: "Place search is temporarily unavailable." }, { status: 502 });
  }
}
