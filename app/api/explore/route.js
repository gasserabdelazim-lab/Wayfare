import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Nominatim "special phrases" return places of that type inside a bounding box.
const PHRASES = {
  coffee: ["cafe"],
  restaurants: ["restaurant"],
  activities: ["museum", "gallery"],
  kids: ["playground", "zoo", "aquarium"],
  sights: ["tourist attraction", "viewpoint", "monument"],
};

// Overpass filters, used only if Nominatim returns nothing.
const FILTERS = {
  coffee: ['["amenity"="cafe"]'],
  restaurants: ['["amenity"="restaurant"]'],
  activities: ['["tourism"~"^(museum|gallery|theme_park|aquarium|zoo)$"]'],
  kids: ['["leisure"="playground"]', '["tourism"~"^(zoo|aquarium|theme_park)$"]'],
  sights: ['["tourism"~"^(attraction|viewpoint)$"]', '["historic"~"^(monument|castle|memorial|ruins)$"]'],
};

const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const UA = "Palvoya trip planner (https://wayfare-wayfare3.vercel.app)";

function prettyKind(value) {
  return String(value || "").split(";")[0].replace(/_/g, " ");
}

async function fromNominatim(phrases, lat, lon) {
  const dLat = 0.03;
  const dLon = 0.03 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const box = [lon - dLon, lat + dLat, lon + dLon, lat - dLat].join(",");
  const lists = await Promise.all(phrases.map(async (phrase) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", phrase);
    url.searchParams.set("viewbox", box);
    url.searchParams.set("bounded", "1");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("extratags", "1");
    url.searchParams.set("limit", "30");
    url.searchParams.set("accept-language", "en");
    const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`nominatim ${response.status}`);
    return response.json();
  }));
  return lists.flat().map((place) => {
    const address = place.address || {};
    const name = place.name || place.display_name?.split(",")[0];
    if (!name) return null;
    const street = [address.road, address.house_number].filter(Boolean).join(" ");
    return {
      id: `n-${place.osm_type}-${place.osm_id}`,
      name,
      kind: prettyKind(place.extratags?.cuisine || place.type),
      address: [street, address.suburb || address.city || address.town].filter(Boolean).join(", "),
      website: place.extratags?.website || "",
      hours: place.extratags?.opening_hours || "",
      latitude: Number(place.lat),
      longitude: Number(place.lon),
      score: ["website", "opening_hours", "phone", "cuisine", "wikidata"].filter((key) => place.extratags?.[key]).length + (street ? 1 : 0),
    };
  }).filter(Boolean);
}

async function fromOverpass(filters, lat, lon) {
  const body = `[out:json][timeout:8];(${filters.map((f) => `nwr(around:2500,${lat},${lon})${f}["name"];`).join("")});out center tags 50;`;
  let lastError = "overpass failed";
  for (const endpoint of OVERPASS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
        body: `data=${encodeURIComponent(body)}`,
        signal: AbortSignal.timeout(7000),
      });
      if (!response.ok) { lastError = `${new URL(endpoint).host}:${response.status}`; continue; }
      const payload = await response.json();
      return (payload.elements || []).map((element) => {
        const tags = element.tags || {};
        const latitude = element.lat ?? element.center?.lat;
        const longitude = element.lon ?? element.center?.lon;
        if (!tags.name || latitude == null || longitude == null) return null;
        return {
          id: `o-${element.type}-${element.id}`,
          name: tags.name,
          kind: prettyKind(tags.cuisine || tags.amenity || tags.tourism || tags.leisure || tags.historic),
          address: [[tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" "), tags["addr:city"]].filter(Boolean).join(", "),
          website: tags.website || "",
          hours: tags.opening_hours || "",
          latitude: Number(latitude),
          longitude: Number(longitude),
          score: ["website", "opening_hours", "phone", "cuisine", "wikidata"].filter((key) => tags[key]).length,
        };
      }).filter(Boolean);
    } catch (error) {
      lastError = `${new URL(endpoint).host}:${error?.name || "error"}`;
    }
  }
  throw new Error(lastError);
}

async function geocodeCity(name) {
  for (const featuretype of ["city", ""]) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", name);
    if (featuretype) url.searchParams.set("featuretype", featuretype);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");
    url.searchParams.set("accept-language", "en");
    const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(8000), next: { revalidate: 604800 } });
    if (!response.ok) continue;
    const [hit] = await response.json();
    if (hit) {
      const a = hit.address || {};
      const label = [a.city || a.town || a.village || a.municipality || hit.name, a.country].filter(Boolean).join(", ");
      return { label, latitude: Number(hit.lat), longitude: Number(hit.lon) };
    }
  }
  return null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = String(searchParams.get("category") || "coffee");
  const place = String(searchParams.get("place") || "").trim().slice(0, 120);
  let lat = Number(searchParams.get("lat"));
  let lon = Number(searchParams.get("lon"));
  let center = null;
  if (place) {
    try { center = await geocodeCity(place); } catch (error) { center = null; }
    if (!center) return NextResponse.json({ results: [], error: "Destination not found." }, { status: 404 });
    lat = center.latitude;
    lon = center.longitude;
  }
  if (!PHRASES[category] || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  const problems = [];
  let found = [];
  try {
    found = await fromNominatim(PHRASES[category], lat, lon);
  } catch (error) {
    problems.push(error.message);
  }
  if (!found.length) {
    try {
      found = await fromOverpass(FILTERS[category], lat, lon);
    } catch (error) {
      problems.push(error.message);
    }
  }

  const seen = new Set();
  const results = found
    .filter((item) => { const key = item.name.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  if (!results.length && problems.length) {
    return NextResponse.json({ results: [], error: "Explore is temporarily unavailable.", problems }, { status: 502 });
  }
  return NextResponse.json({ results, center }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
}
