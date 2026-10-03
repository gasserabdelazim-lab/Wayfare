export const dynamic = "force-dynamic";

// Streams a Google Places photo without exposing the API key to the browser.
export async function GET(request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const name = new URL(request.url).searchParams.get("name") || "";
  if (!key || !/^places\/[\w-]+\/photos\/[\w-]+$/.test(name)) return new Response("Not found", { status: 404 });
  try {
    const response = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=500&key=${key}`, { signal: AbortSignal.timeout(9000) });
    if (!response.ok) return new Response("Unavailable", { status: 502 });
    return new Response(response.body, {
      headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable" },
    });
  } catch (error) {
    return new Response("Unavailable", { status: 502 });
  }
}
