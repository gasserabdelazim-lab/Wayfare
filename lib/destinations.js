const GENERIC_TRAVEL_PHOTO = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=85";

const DESTINATIONS = [
  {
    match: /barcelona/i,
    term: "Barcelona",
    photos: [
      "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1600&q=85",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Evening_light_over_Barcelona.jpg/1920px-Evening_light_over_Barcelona.jpg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Barcelona_Cathedral_Saint_Eulalia.jpg/1920px-Barcelona_Cathedral_Saint_Eulalia.jpg",
    ],
  },
  { match: /cairo|giza/i, term: "Cairo", photos: ["https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Giza_Pyramids.jpg/1280px-The_Giza_Pyramids.jpg"] },
  { match: /paris/i, term: "Paris", photos: ["https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=85"] },
  { match: /london/i, term: "London", photos: ["https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=85"] },
  { match: /tokyo/i, term: "Tokyo", photos: ["https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1600&q=85"] },
  { match: /dubai/i, term: "Dubai", photos: ["https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=85"] },
  { match: /rome/i, term: "Rome", photos: ["https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=85"] },
  { match: /lisbon/i, term: "Lisbon", photos: ["https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1600&q=85"] },
  { match: /amsterdam/i, term: "Amsterdam", photos: ["https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1600&q=85"] },
  { match: /istanbul/i, term: "Istanbul", photos: ["https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1600&q=85"] },
  { match: /new york|nyc/i, term: "New York City", photos: ["https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1600&q=85"] },
  { match: /bali/i, term: "Bali", photos: ["https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=85"] },
];

function cleanTripWords(name) {
  return String(name || "")
    .replace(/\b(trip|holiday|vacation|weekend|getaway|adventure|tour|travel|summer|winter|spring|autumn|fall)\b/gi, " ")
    .replace(/\b(with|friends|family|the|to|in|my|our)\b/gi, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/[^\p{L}\p{M}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function destinationInfo(name) {
  const known = DESTINATIONS.find((destination) => destination.match.test(String(name || "")));
  const term = known?.term || cleanTripWords(name) || String(name || "").trim();
  return { term, photos: known?.photos || [GENERIC_TRAVEL_PHOTO], known: Boolean(known) };
}

function titleMatchesDestination(title, term) {
  const normalizedTitle = String(title || "").toLocaleLowerCase();
  const normalizedTerm = String(term || "").toLocaleLowerCase();
  if (!normalizedTerm) return false;
  if (normalizedTitle.includes(normalizedTerm)) return true;
  const meaningfulWords = normalizedTerm.split(/\s+/).filter((word) => word.length > 2);
  return meaningfulWords.length > 0 && meaningfulWords.every((word) => normalizedTitle.includes(word));
}

export async function findDestinationPhotos(name, { size = 1600, limit = 6, signal } = {}) {
  const info = destinationInfo(name);
  if (!info.term) return info.photos.slice(0, limit);

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    generator: "search",
    gsrsearch: `\"${info.term}\" landmark`,
    gsrnamespace: "0",
    gsrlimit: "12",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: String(size),
    pilimit: "12",
  });

  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal });
  if (!response.ok) throw new Error("Destination image search failed");
  const payload = await response.json();
  const matched = (payload.query?.pages || [])
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .filter((page) => titleMatchesDestination(page.title, info.term))
    .map((page) => page.thumbnail?.source)
    .filter(Boolean);

  return [...new Set([...info.photos, ...matched])].slice(0, limit);
}
