export const RATING_CACHE_SECONDS = 7 * 24 * 60 * 60;
const QUERIES = {
  coffee: 'coffee shops', restaurants: 'restaurants',
  activities: 'museums and activities', kids: 'kid friendly attractions',
  sights: 'sights and landmarks',
};

export function ratingSearch(category, latitude, longitude, label) {
  if (!Object.hasOwn(QUERIES, category) || !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    throw new Error('Invalid destination');
  }
  return {
    q: `${QUERIES[category]} in ${String(label || 'this area').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')}`,
    ll: `@${latitude.toFixed(3)},${longitude.toFixed(3)},14z`,
  };
}

export function hasFreeSearches(account) {
  return account?.plan_monthly_price === 0 &&
    /free/i.test(account?.plan_name || '') &&
    Number.isFinite(account?.plan_searches_left) && account.plan_searches_left > 0;
}

function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; }
  catch { return ''; }
}

export function mapRatedPlaces(payload) {
  return (Array.isArray(payload?.local_results) ? payload.local_results : []).map((place) => {
    const lat = place.gps_coordinates?.latitude;
    const lon = place.gps_coordinates?.longitude;
    if (!place.place_id || !place.title || !Number.isFinite(lat) || !Number.isFinite(lon) ||
        Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    const rating = Number.isFinite(place.rating) && place.rating >= 1 && place.rating <= 5 ? place.rating : null;
    const ratingCount = Number.isInteger(place.reviews) && place.reviews > 0 ? place.reviews : null;
    const maps = new URL('https://www.google.com/maps/search/');
    maps.searchParams.set('api', '1');
    maps.searchParams.set('query', `${place.title} ${place.address || ''}`);
    maps.searchParams.set('query_place_id', place.place_id);
    return {
      id: `g-${place.place_id}`, name: place.title, kind: place.type || '',
      address: place.address || '', latitude: lat, longitude: lon,
      website: safeUrl(place.website), mapsUrl: maps.href, hours: place.hours || '',
      rating, ratingCount, ratingSource: 'Google Maps via SerpApi',
      // No extra photo/review-detail calls: one search supplies the whole list.
      photo: safeUrl(place.thumbnail),
      score: (rating || 0) * Math.log10((ratingCount || 0) + 10),
    };
  }).filter(Boolean);
}

export async function fetchRatedPlaces(search, key, fetcher = fetch) {
  if (!key) throw new Error('Ratings not configured');
  const accountUrl = new URL('https://serpapi.com/account.json');
  accountUrl.searchParams.set('api_key', key);
  let accountResponse;
  try {
    accountResponse = await fetcher(accountUrl, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!accountResponse.ok || !hasFreeSearches(await accountResponse.json())) {
      throw new Error('Free allowance unavailable');
    }
  } catch {
    // Fail closed. Never switch to a paid provider or expose a URL containing the key.
    throw new Error('Free ratings unavailable');
  }
  const url = new URL('https://serpapi.com/search.json');
  for (const [name, value] of Object.entries({ engine: 'google_maps', type: 'search', hl: 'en', ...search, api_key: key })) {
    url.searchParams.set(name, value);
  }
  try {
    const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Provider unavailable');
    const payload = await response.json();
    if (payload.error) throw new Error('Provider unavailable');
    return mapRatedPlaces(payload);
  } catch { throw new Error('Ratings temporarily unavailable'); }
}
