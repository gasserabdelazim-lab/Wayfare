// Shared helpers used by both the trip-list (home) page and the trip page.

export const CURRENCIES = [
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
  { code: "CHF", symbol: "CHF", label: "Swiss Franc" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "MXN", symbol: "MX$", label: "Mexican Peso" },
  { code: "AED", symbol: "AED", label: "UAE Dirham" },
  { code: "EGP", symbol: "E£", label: "Egyptian Pound" },
  { code: "SAR", symbol: "SAR", label: "Saudi Riyal" },
  { code: "SEK", symbol: "kr", label: "Swedish Krona" },
  { code: "THB", symbol: "฿", label: "Thai Baht" },
  { code: "TRY", symbol: "₺", label: "Turkish Lira" },
];

export function currencySymbol(code) {
  const sym = CURRENCIES.find((c) => c.code === code)?.symbol || code || "€";
  // Word-style symbols (CHF, AED, SAR — no $/£/€ glyph) read better with a
  // trailing space before the number; single-glyph and glyph+letter symbols
  // (€, $, A$, E£) read better flush against it.
  return /^[A-Z]+$/.test(sym) ? sym + " " : sym;
}

// ---- Local "my trips" list ----
// There's no login, so the home page remembers which trips this browser has
// created or joined in localStorage, most-recent-first, and looks them up
// from Supabase to build the trip list.
const TRIPS_KEY = "wayfare_trips";

export function getLocalTrips() {
  try {
    return JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function rememberTrip(id) {
  try {
    const list = getLocalTrips().filter((t) => t !== id);
    list.unshift(id);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {}
}

export function forgetTrip(id) {
  try {
    const list = getLocalTrips().filter((t) => t !== id);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(list));
  } catch {}
}

// ---- Location search (OpenStreetMap Nominatim — free, no API key needed) ----
// Nominatim's usage policy asks for modest, debounced request volume; the
// UI that calls this debounces keystrokes and this helper cancels any
// in-flight request before starting a new one so only one is ever pending.
let geocodeAbort = null;
export async function searchPlaces(query) {
  if (!query || query.trim().length < 3) return [];
  if (geocodeAbort) geocodeAbort.abort();
  geocodeAbort = new AbortController();
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=6&q=${encodeURIComponent(query)}`,
      { signal: geocodeAbort.signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((d) => ({
      label: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }));
  } catch (e) {
    return [];
  }
}

export function mapsUrl(location, lat, lng) {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}
