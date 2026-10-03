import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FILTERS = {
  coffee: ['["amenity"="cafe"]'],
  restaurants: ['["amenity"="restaurant"]'],
  activities: ['["tourism"~"^(museum|gallery|theme_park|aquarium|zoo)$"]', '["leisure"~"^(water_park|miniature_golf|bowling_alley)$"]'],
  kids: ['["leisure"="playground"]["name"]', '["tourism"~"^(zoo|aquarium|theme_park)$"]'],
  sights: ['["tourism"~"^(attraction|viewpoint)$"]', '["historic"~"^(monument|castle|memorial|ruins)$"]'],
};

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function label(tags) {
  const kind = tags.cuisine || tags.amenity || tags.tourism || tags.leisure || tags.historic || "";
  return String(kind).split(";")[0].replace(/_/g, " ");
}

function address(tags) {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  return [street, tags["addr:city"]].filter(Boolean).join(", ");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const category = String(searchParams.get("category") || "coffee");
  const filters = FILTERS[category];
  if (!filters || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  const radius = 2500;
  const body = `[out:json][timeout:20];(${filters.map((f) => `nwr(around:${radius},${lat},${lon})${f}${f.includes('["name"]') ? "" : '["name"]'};`).join("")});out center tags 60;`;

  const attempts = [];
  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Palvoya explore" },
        body: `data=${encodeURIComponent(body)}`,
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) { attempts.push(`${new URL(endpoint).host}:${response.status}`); continue; }
      const payload = await response.json();
      const seen = new Set();
      const results = (payload.elements || [])
        .map((element) => {
          const tags = element.tags || {};
          const latitude = element.lat ?? element.center?.lat;
          const longitude = element.lon ?? element.center?.lon;
          if (!tags.name || latitude == null || longitude == null) return null;
          const score = ["website", "opening_hours", "phone", "cuisine", "addr:street", "wikidata"].filter((key) => tags[key]).length;
          return {
            id: `${element.type}-${element.id}`,
            name: tags.name,
            kind: label(tags),
            address: address(tags),
            website: tags.website || tags["contact:website"] || "",
            hours: tags.opening_hours || "",
            latitude: Number(latitude),
            longitude: Number(longitude),
            score,
          };
        })
        .filter(Boolean)
        .filter((item) => { const key = item.name.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
        .sort((a, b) => b.score - a.score)
        .slice(0, 30);
      return NextResponse.json({ results }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
    } catch (error) {
      attempts.push(`${new URL(endpoint).host}:${error?.name || "error"}`);
    }
  }
  return NextResponse.json({ results: [], error: "Explore is temporarily unavailable.", attempts }, { status: 502 });
}
