import { unstable_cache } from 'next/cache';
import { fetchRatedPlaces, ratingSearch, RATING_CACHE_SECONDS } from './explore-ratings.mjs';

// Next's persistent Data Cache is shared between users on the deployment, unlike
// a browser cache or process-local Map. The secret is not part of cached results.
const cachedSearch = unstable_cache(
  async (q, ll) => fetchRatedPlaces({ q, ll }, process.env.SERPAPI_API_KEY),
  ['explore-free-ratings-v1'],
  { revalidate: RATING_CACHE_SECONDS, tags: ['explore-ratings'] },
);
const pending = new Map();

export async function sharedRatedPlaces(category, latitude, longitude, label) {
  const { q, ll } = ratingSearch(category, latitude, longitude, label);
  const id = JSON.stringify([q, ll]);
  // Coalesce concurrent requests within an instance as well as persisting results.
  if (!pending.has(id)) pending.set(id, cachedSearch(q, ll).finally(() => pending.delete(id)));
  return pending.get(id);
}
