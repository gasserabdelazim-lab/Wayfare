"use client";
import ActivityPolls from "../../../components/ActivityPolls";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "../../../lib/supabaseClient";
import NavIcon from "../../../components/NavIcon";
import AccountPanel from "../../../components/AccountPanel";
import { destinationInfo, findDestinationPhotos } from "../../../lib/destinations";
import { useWayfareAccount } from "../../../lib/useWayfareAccount";

const TripMap = dynamic(() => import("../../../components/TripMap"), {
  ssr: false,
  loading: () => <div className="map-loading-card">Preparing your trip map…</div>,
});

const icons = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/></svg>',
  coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 15c0 1 1 1.8 2.5 1.8s2.5-.7 2.5-1.6c0-2.3-5-1.1-5-3.4 0-.9 1-1.6 2.5-1.6s2.5.6 2.5 1.5"/><line x1="12" y1="8" x2="12" y2="16.2"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="5" width="17" height="15" rx="2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3zm0 0 5-7a2 2 0 0 1 3.6 1.7L14.5 9H19a2 2 0 0 1 2 2.3l-1.4 8A3 3 0 0 1 16.6 22H10a3 3 0 0 1-3-3"/></svg>',
  meh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="8" y1="15" x2="16" y2="15"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3zm0 0-5 7a2 2 0 0 1-3.6-1.7L9.5 15H5a2 2 0 0 1-2-2.3l1.4-8A3 3 0 0 1 7.4 2H14a3 3 0 0 1 3 3"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="12" x2="18" y2="12"/><polyline points="13 7 18 12 13 17"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>',
};

function Icon({ name, style }) {
  return <span style={style} dangerouslySetInnerHTML={{ __html: icons[name] }} />;
}

const AVATAR_COLORS = ["#1f6f63", "#d0603f", "#b98a2e", "#5b6fa8", "#8a5b96", "#4a8f6b", "#a8544b"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}
function Avatar({ name, avatar, size = 26 }) {
  const isPhoto = avatar?.startsWith("data:image") || avatar?.startsWith("https://");
  return (
    <span
      className={`avatar${isPhoto ? " avatar-photo" : ""}`}
      style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColor(name) }}
      title={name}
    >
      {isPhoto ? <img src={avatar} alt="" /> : avatar || initials(name)}
    </span>
  );
}

const AVATAR_OPTIONS = ["🧭", "😎", "🌴", "⛰️", "🌊", "🏕️", "🛫", "📸"];

function compressProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const size = 220;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const SUGGESTIONS = [
  { name: "Breakfast spot", cat: "food" },
  { name: "Museum or gallery", cat: "sight" },
  { name: "Local market", cat: "sight" },
  { name: "Sunset viewpoint", cat: "sight" },
  { name: "Group dinner", cat: "food" },
  { name: "Walking tour", cat: "sight" },
  { name: "Beach / swim time", cat: "chill" },
  { name: "Bar / nightlife", cat: "chill" },
  { name: "Free morning — sleep in", cat: "chill" },
  { name: "Day trip out of town", cat: "sight" },
];

const TIME_OPTIONS = ["Flexible", ...Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 ? "30" : "00";
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
})];

const POPULAR_PLACES = {
  barcelona: ["Sagrada Família", "Park Güell", "Gothic Quarter", "La Boqueria Market", "Barceloneta Beach", "Casa Batlló", "Montjuïc"],
  paris: ["Eiffel Tower", "Louvre Museum", "Montmartre", "Musée d'Orsay", "Le Marais", "Arc de Triomphe"],
  dubai: ["Burj Khalifa", "Dubai Mall", "Museum of the Future", "Dubai Marina", "Al Fahidi Historical Neighbourhood"],
  tokyo: ["Shibuya Crossing", "Sensō-ji", "Meiji Jingu", "Tokyo Skytree", "Tsukiji Outer Market"],
  london: ["Tower of London", "British Museum", "Covent Garden", "Borough Market", "Westminster Abbey"],
  rome: ["Colosseum", "Trevi Fountain", "Pantheon", "Vatican Museums", "Piazza Navona"],
};

function suggestedLocations(query, tripName) {
  const clean = query.trim();
  if (!clean) return [];
  const destination = String(tripName || "").toLowerCase();
  const cityKey = Object.keys(POPULAR_PLACES).find((city) => destination.includes(city));
  const matches = cityKey ? POPULAR_PLACES[cityKey].filter((place) => place.toLowerCase().includes(clean.toLowerCase())) : [];
  const contextual = `${clean}, ${tripName}`;
  return [...new Set([...matches, contextual, clean])].slice(0, 6);
}

function formatPlaceResult(feature) {
  const place = feature?.properties || {};
  const label = [...new Set([
    place.name,
    place.street,
    place.district,
    place.city || place.town || place.village,
    place.state,
    place.country,
  ].filter(Boolean))].join(", ");
  const [longitude, latitude] = feature?.geometry?.coordinates || [];
  if (!label) return null;
  return {
    label,
    latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
    longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
  };
}

async function geocodePlace(query, tripName, signal) {
  const clean = String(query || "").trim();
  if (!clean) return null;
  const results = await searchExactPlaces(clean, signal);
  return results[0] || null;
}

async function searchExactPlaces(search, signal) {
  const encoded = encodeURIComponent(search);
  const request = async (url, format) => {
    const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!response.ok || !String(response.headers.get("content-type") || "").includes("application/json")) throw new Error("Invalid place response");
    const payload = await response.json();
    return format === "photon" ? (payload.features || []).map(formatPlaceResult).filter(Boolean) : (payload.results || []);
  };
  const attempts = [
    request(`/api/places?q=${encoded}`, "api"),
    request(`https://photon.komoot.io/api/?q=${encoded}&limit=8&lang=en`, "photon"),
  ];
  try {
    return await Promise.any(attempts.map((attempt) => attempt.then((results) => {
      if (!results.length) throw new Error("No places found");
      return results;
    })));
  } catch {
    return [];
  }
}

function PlacePicker({ value = "", tripName = "", onValueChange, onCommit, compact = false }) {
  const [query, setQuery] = useState(value || "");
  const [remoteResults, setRemoteResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const queryRef = useRef(value || "");

  useEffect(() => {
    const next = value || "";
    setQuery(next);
    queryRef.current = next;
  }, [value]);

  useEffect(() => {
    const clean = query.trim();
    if (!open || clean.length < 2) {
      setRemoteResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      const requestTimeout = setTimeout(() => controller.abort(), 7000);
      try {
        setRemoteResults(await searchExactPlaces(clean, controller.signal));
      } catch (error) {
        if (error.name !== "AbortError") setRemoteResults([]);
      } finally {
        clearTimeout(requestTimeout);
        if (active) setLoading(false);
      }
    }, 320);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, tripName]);

  const fallbackResults = suggestedLocations(query, tripName).map((label) => ({ label, latitude: null, longitude: null }));
  const results = [...remoteResults, ...fallbackResults]
    .filter((place, index, items) => place.label.toLowerCase() !== query.trim().toLowerCase() && items.findIndex((candidate) => candidate.label === place.label) === index)
    .slice(0, 6);

  function changeValue(next) {
    setQuery(next);
    queryRef.current = next;
    onValueChange?.(next);
    setOpen(true);
  }

  function commitValue(next) {
    const place = typeof next === "string" ? { label: next, latitude: null, longitude: null } : next;
    const clean = String(place?.label || "").trim();
    setQuery(clean);
    queryRef.current = clean;
    onValueChange?.(clean);
    onCommit?.(clean, { latitude: place?.latitude ?? null, longitude: place?.longitude ?? null });
    setOpen(false);
  }

  return (
    <div className={`location-autocomplete place-picker${compact ? " compact-place-picker" : ""}`}>
      <input
        aria-label={compact ? "Activity location" : "Location"}
        placeholder="Search an exact place"
        value={query}
        autoComplete="off"
        onFocus={(event) => { setOpen(true); if (compact) event.currentTarget.select(); }}
        onChange={(event) => changeValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitValue(queryRef.current);
          }
          if (event.key === "Escape") setOpen(false);
        }}
        onBlur={() => setTimeout(() => {
          if (queryRef.current.trim() !== String(value || "").trim()) commitValue(queryRef.current);
          else setOpen(false);
        }, 180)}
      />
      {open && query.trim().length >= 2 && (
        <div className="location-suggestions" role="listbox" aria-label="Location suggestions">
          {loading && <div className="location-loading">Finding exact places…</div>}
          {results.map((place) => (
            <button type="button" key={place.label} onMouseDown={(event) => event.preventDefault()} onClick={() => commitValue(place)}>
              {place.label}<small>Use this exact location · add it to your trip map</small>
            </button>
          ))}
          {!loading && results.length === 0 && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => commitValue(query)}>Use “{query.trim()}”<small>Save the location as typed</small></button>}
        </div>
      )}
    </div>
  );
}

const CURRENCIES = {
  EUR: { symbol: "€", label: "Euro" },
  USD: { symbol: "$", label: "US dollar" },
  GBP: { symbol: "£", label: "British pound" },
  AED: { symbol: "AED ", label: "UAE dirham" },
  CHF: { symbol: "CHF ", label: "Swiss franc" },
  CAD: { symbol: "CA$", label: "Canadian dollar" },
  AUD: { symbol: "A$", label: "Australian dollar" },
  JPY: { symbol: "¥", label: "Japanese yen" },
  EGP: { symbol: "E£", label: "Egyptian pound" },
  TRY: { symbol: "₺", label: "Turkish lira" },
  SAR: { symbol: "SAR ", label: "Saudi riyal" },
};

const SPLIT_METHODS = {
  equal: { label: "Equal", hint: "Same amount each" },
  exact: { label: "Exact", hint: "Enter each amount" },
  percentage: { label: "%", hint: "Enter percentages" },
  shares: { label: "Shares", hint: "Use ratios" },
};

function roundMoney(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function allocateByWeight(total, entries) {
  const totalCents = Math.round(Number(total || 0) * 100);
  const weightTotal = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (!entries.length || weightTotal <= 0) return entries.map((entry) => ({ ...entry, amount: 0 }));
  const calculated = entries.map((entry, index) => {
    const raw = totalCents * (Math.max(0, Number(entry.weight) || 0) / weightTotal);
    const cents = Math.floor(raw);
    return { ...entry, index, cents, fraction: raw - cents };
  });
  let remainder = totalCents - calculated.reduce((sum, entry) => sum + entry.cents, 0);
  [...calculated].sort((a, b) => b.fraction - a.fraction || a.index - b.index).forEach((entry) => {
    if (remainder > 0) {
      calculated[entry.index].cents += 1;
      remainder -= 1;
    }
  });
  return calculated.map(({ cents, fraction, index, ...entry }) => ({ ...entry, amount: cents / 100 }));
}

function compressReceipt(file) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) return reject(new Error("Choose an image file."));
    if (file.size > 6 * 1024 * 1024) return reject(new Error("Receipt images must be under 6 MB."));
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const EXPENSE_GROUP_PREFIX = "WAYFARE_GROUP::";

function isExpenseGroupName(name) {
  return String(name || "").startsWith(EXPENSE_GROUP_PREFIX);
}

function displayGroupName(name) {
  return String(name || "").replace(EXPENSE_GROUP_PREFIX, "");
}

function inclusiveTripDays(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (end < start) return null;
  return Math.round((end - start) / 86400000) + 1;
}

function formatTripRange(startDate, endDate) {
  if (!startDate) return "Dates not set";
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate || startDate}T12:00:00`);
  const startText = start.toLocaleDateString([], { month: "short", day: "numeric" });
  const endText = end.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  return `${startText} – ${endText}`;
}

function formatTripDayDate(startDate, index) {
  if (!startDate) return "";
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + index);
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function tripDayISO(startDate, index) {
  if (!startDate) return "";
  const date = new Date(`${startDate}T12:00:00`);
  date.setDate(date.getDate() + index);
  return date.toISOString().slice(0, 10);
}

function useDestinationPhotos(name) {
  const [photos, setPhotos] = useState(destinationInfo(name).photos);

  useEffect(() => {
    if (!name) return;
    const controller = new AbortController();
    setPhotos(destinationInfo(name).photos);
    findDestinationPhotos(name, { size: 1600, limit: 6, signal: controller.signal })
      .then((found) => found.length && setPhotos(found))
      .catch(() => {});
    return () => controller.abort();
  }, [name]);

  return photos;
}

function mapsUrl(activity) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location || activity.name)}`;
}

function bookingUrl(activity, tripName) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${activity.name} ${activity.location || tripName} tickets booking`)}`;
}

function fmtDay(dateStr, fallbackLabel) {
  if (!dateStr) return fallbackLabel;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return fallbackLabel;
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const md = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${weekday} · ${md}`;
}

function downloadIcs(activity) {
  const dateStr = activity.day_date;
  if (!dateStr) return;
  let h = 9, m = 0;
  const match = (activity.time_text || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    h = parseInt(match[1]);
    m = parseInt(match[2]);
    const ampm = (match[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
  }
  const start = new Date(dateStr + "T00:00:00");
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + 90 * 60000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wayfare//Trip//EN", "BEGIN:VEVENT",
    "UID:" + activity.id + "@wayfare",
    "DTSTAMP:" + fmt(start),
    "DTSTART:" + fmt(start),
    "DTEND:" + fmt(end),
    "SUMMARY:" + activity.name,
    "LOCATION:" + (activity.location || ""),
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = activity.name.replace(/[^a-z0-9]/gi, "_") + ".ics";
  a.click();
  URL.revokeObjectURL(url);
}

export default function TripPage() {
  const { id: tripId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const account = useWayfareAccount();
  const [trip, setTrip] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [votesByActivity, setVotesByActivity] = useState({});
  const [commentsByActivity, setCommentsByActivity] = useState({});
  const [extraCosts, setExtraCosts] = useState([]);
  const [expenseSplits, setExpenseSplits] = useState({});
  const [settlements, setSettlements] = useState([]);
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [newActivity, setNewActivity] = useState({ day_label: "Day 1", day_date: "", name: "", location: "", latitude: null, longitude: null, time_text: "", cost_pp: "", booking_info: "" });
  const [activityError, setActivityError] = useState("");
  const [activitySaving, setActivitySaving] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [costForm, setCostForm] = useState({ desc: "", amt: "", paidBy: "", currency: "", exchangeRate: "1", splitMethod: "equal", participantIds: [], splitValues: {}, notes: "", receiptData: "" });
  const [costSaving, setCostSaving] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [settlementSaving, setSettlementSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get("view");
    return ["plan", "settle", "updates", "profile"].includes(requested) ? requested : "plan";
  });
  const [currency, setCurrency] = useState("EUR");
  const [tripDateDraft, setTripDateDraft] = useState({ start: "", end: "" });
  const [profileDraft, setProfileDraft] = useState({ name: "", home: "", bio: "", currency: "EUR" });
  const [justAddedId, setJustAddedId] = useState(null);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const [planView, setPlanView] = useState("timeline");
  const [mapDay, setMapDay] = useState("All days");
  const [shareOpen, setShareOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [accessState, setAccessState] = useState("loading");
  const [accessError, setAccessError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const itemRefs = useRef({});
  const addFormRef = useRef(null);
  const geocodingRef = useRef(new Set());
  const destinationPhotos = useDestinationPhotos(displayGroupName(trip?.name));
  const inviteToken = searchParams.get("invite");

  useEffect(() => {
    if (isExpenseGroupName(trip?.name) && activeTab === "plan") switchTab("settle");
  }, [trip?.name, activeTab]);

  useEffect(() => {
    const requested = searchParams.get("view");
    const fallback = isExpenseGroupName(trip?.name) ? "settle" : "plan";
    const next = ["plan", "settle", "updates", "profile"].includes(requested) ? requested : fallback;
    if (next !== activeTab) setActiveTab(next);
  }, [searchParams, trip?.name]);

  useEffect(() => {
    if (!account.profile) return;
    const cloud = account.profile;
    setProfileDraft({
      name: cloud.display_name || me || "",
      home: cloud.home_city || "",
      bio: cloud.bio || "",
      currency: CURRENCIES[cloud.preferred_currency] ? cloud.preferred_currency : "EUR",
    });
  }, [account.profile]);

  useEffect(() => {
    setHeroPhotoIndex(0);
    if (destinationPhotos.length < 2) return;
    const timer = setInterval(() => setHeroPhotoIndex((index) => (index + 1) % destinationPhotos.length), 6500);
    return () => clearInterval(timer);
  }, [destinationPhotos]);

  const load = useCallback(async () => {
    const { data: tripData, error: tripError } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
    if (tripError || !tripData) {
      setTrip(null);
      return false;
    }
    setTrip(tripData);
    setTripDateDraft({ start: tripData?.start_date || "", end: tripData?.end_date || "" });
    if (tripData?.currency && CURRENCIES[tripData.currency]) setCurrency(tripData.currency);

    const { data: travelerData } = await supabase.from("travelers").select("*").eq("trip_id", tripId);
    setTravelers(travelerData || []);
    const linkedTraveler = (travelerData || []).find((traveler) => traveler.user_id === account.user?.id);
    if (linkedTraveler) {
      setMe(linkedTraveler.name);
      localStorage.setItem(`wayfare_name_${tripId}`, linkedTraveler.name);
    }

    const { data: activityData } = await supabase
      .from("activities").select("*").eq("trip_id", tripId).order("sort_order");
    setActivities(activityData || []);

    const activityIds = (activityData || []).map((a) => a.id);
    if (activityIds.length) {
      const { data: voteData } = await supabase.from("votes").select("*").in("activity_id", activityIds);
      const vMap = {};
      (voteData || []).forEach((v) => {
        vMap[v.activity_id] = vMap[v.activity_id] || [];
        vMap[v.activity_id].push(v);
      });
      setVotesByActivity(vMap);

      const { data: commentData } = await supabase.from("comments").select("*, travelers(name)").in("activity_id", activityIds);
      const cMap = {};
      (commentData || []).forEach((c) => {
        cMap[c.activity_id] = cMap[c.activity_id] || [];
        cMap[c.activity_id].push(c);
      });
      setCommentsByActivity(cMap);
    } else {
      setVotesByActivity({});
      setCommentsByActivity({});
    }

    const { data: costData } = await supabase.from("extra_costs").select("*, travelers(name)").eq("trip_id", tripId).order("created_at", { ascending: false });
    const costs = costData || [];
    setExtraCosts(costs);
    const costIds = costs.map((cost) => cost.id);
    if (costIds.length) {
      const { data: splitData } = await supabase.from("expense_splits").select("*").in("expense_id", costIds);
      const splitMap = {};
      (splitData || []).forEach((split) => {
        splitMap[split.expense_id] = splitMap[split.expense_id] || [];
        splitMap[split.expense_id].push(split);
      });
      setExpenseSplits(splitMap);
    } else {
      setExpenseSplits({});
    }
    const { data: settlementData } = await supabase.from("settlements").select("*").eq("trip_id", tripId).order("settled_at", { ascending: false });
    setSettlements(settlementData || []);
    setCostForm((current) => ({
      ...current,
      currency: current.currency || tripData?.currency || "EUR",
      participantIds: (current.desc || current.amt || current.notes)
        ? current.participantIds.filter((id) => (travelerData || []).some((traveler) => traveler.id === id))
        : (travelerData || []).map((traveler) => traveler.id),
    }));
    return true;
  }, [tripId, account.user?.id]);

  useEffect(() => {
    const savedName = localStorage.getItem(`wayfare_name_${tripId}`);
    if (savedName) setMe(savedName);
    const savedCurrency = localStorage.getItem(`wayfare_currency_${tripId}`);
    if (savedCurrency && CURRENCIES[savedCurrency]) setCurrency(savedCurrency);
    const preferredCurrency = localStorage.getItem("wayfare_profile_currency") || "EUR";
    setProfileDraft({
      name: savedName || localStorage.getItem("wayfare_profile_name") || "",
      home: localStorage.getItem("wayfare_profile_home") || "",
      bio: localStorage.getItem("wayfare_profile_bio") || "",
      currency: CURRENCIES[preferredCurrency] ? preferredCurrency : "EUR",
    });
  }, [tripId]);

  useEffect(() => {
    if (account.loading) return;
    if (!account.user) {
      setAccessState("signin");
      setTrip(null);
      return;
    }
    let cancelled = false;
    async function openPrivateTrip() {
      setAccessState("loading");
      setAccessError("");
      const metadata = account.user.user_metadata || {};
      const memberName = account.profile?.display_name || metadata.full_name || metadata.name || localStorage.getItem("wayfare_profile_name") || account.user.email?.split("@")[0] || "Traveler";
      const memberAvatar = account.profile?.avatar || metadata.avatar_url || metadata.picture || localStorage.getItem("wayfare_profile_avatar") || null;

      if (inviteToken) {
        const { error } = await supabase.rpc("accept_trip_invite", { invite_token: inviteToken, member_name: memberName, member_avatar: memberAvatar });
        if (error) {
          if (!cancelled) {
            setAccessError(error.message || "This invitation is invalid or has expired.");
            setAccessState("denied");
          }
          return;
        }
      } else {
        const legacyName = localStorage.getItem(`wayfare_name_${tripId}`);
        if (legacyName) await supabase.rpc("claim_legacy_trip", { target_trip: tripId, member_name: legacyName });
      }

      const allowed = await load();
      if (cancelled) return;
      setAccessState(allowed ? "allowed" : "denied");
      if (!allowed) setAccessError("This plan is private. Ask the owner for a new invite link.");
      if (allowed && inviteToken) {
        const requestedView = searchParams.get("view");
        router.replace(`/trip/${tripId}${requestedView ? `?view=${requestedView}` : ""}`, { scroll: false });
      }
    }
    openPrivateTrip();
    return () => { cancelled = true; };
  }, [account.loading, account.user?.id, account.profile?.display_name, account.profile?.avatar, tripId, inviteToken, load]);

  useEffect(() => {
    if (accessState !== "allowed") return;
    const channel = supabase
      .channel(`trip-${tripId}`)
      .on("postgres_changes", { event: "*", schema: "public" }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [tripId, load, accessState]);

  useEffect(() => {
    if (justAddedId && itemRefs.current[justAddedId]) {
      itemRefs.current[justAddedId].scrollIntoView({ behavior: "smooth", block: "center" });
      const t = setTimeout(() => setJustAddedId(null), 2200);
      return () => clearTimeout(t);
    }
  }, [justAddedId, activities]);

  useEffect(() => {
    if (accessState !== "allowed") return;
    const pending = activities.filter((activity) => activity.location && (activity.latitude == null || activity.longitude == null) && !geocodingRef.current.has(activity.id)).slice(0, 6);
    if (!pending.length) return;
    const controller = new AbortController();
    pending.forEach((activity) => geocodingRef.current.add(activity.id));
    Promise.all(pending.map(async (activity) => {
      try {
        const place = await geocodePlace(activity.location, displayGroupName(trip?.name), controller.signal);
        if (!place || place.latitude == null || place.longitude == null) return null;
        return { id: activity.id, latitude: place.latitude, longitude: place.longitude };
      } catch {
        return null;
      }
    })).then((results) => {
      if (controller.signal.aborted) return;
      const mapped = results.filter(Boolean);
      if (!mapped.length) return;
      setActivities((current) => current.map((item) => {
        const match = mapped.find((place) => place.id === item.id);
        return match ? { ...item, latitude: match.latitude, longitude: match.longitude } : item;
      }));
      Promise.all(mapped.map((place) => supabase.from("activities").update({ latitude: place.latitude, longitude: place.longitude }).eq("id", place.id))).catch(() => {});
    });
    return () => controller.abort();
  }, [activities, accessState, trip?.name]);

  function myTraveler() {
    return (account.user && travelers.find((t) => t.user_id === account.user.id)) || travelers.find((t) => t.name.toLowerCase() === (me || "").toLowerCase());
  }

  function switchTab(nextTab) {
    const safeTab = isExpenseGroupName(trip?.name) && nextTab === "plan" ? "settle" : nextTab;
    setActiveTab(safeTab);
    router.replace(`/trip/${tripId}${safeTab === "plan" ? "" : `?view=${safeTab}`}`, { scroll: false });
  }

  function showNotice(text, type = "success") {
    setActionNotice({ text, type });
    window.setTimeout(() => setActionNotice(null), 3200);
  }

  async function updateMyAvatar(avatar) {
    const traveler = myTraveler();
    if (!traveler) return;
    setTravelers((current) => current.map((item) => item.id === traveler.id ? { ...item, avatar } : item));
    localStorage.setItem("wayfare_profile_avatar", avatar);
    const { error } = await supabase.from("travelers").update({ avatar }).eq("id", traveler.id);
    if (error) showNotice(`Avatar wasn't saved: ${error.message}`, "error");
    else {
      await account.saveProfile({ ...profileDraft, name: profileDraft.name || me, avatar });
      showNotice(account.user ? "Avatar updated and synced." : "Avatar updated.");
    }
  }

  async function chooseMyPhoto(file) {
    if (!file) return;
    try {
      await updateMyAvatar(await compressProfilePhoto(file));
    } catch {
      showNotice("That photo couldn't be used. Try a JPG or PNG.", "error");
    }
  }

  async function savePersonalProfile() {
    const nextName = profileDraft.name.trim();
    if (!nextName) {
      showNotice("Add your display name first.", "error");
      return;
    }
    const traveler = myTraveler();
    const duplicate = travelers.find((item) => item.id !== traveler?.id && item.name.toLowerCase() === nextName.toLowerCase());
    if (duplicate) {
      showNotice("Someone on this trip already uses that name.", "error");
      return;
    }
    if (traveler) {
      const { error } = await supabase.from("travelers").update({ name: nextName, user_id: account.user?.id || traveler.user_id || null }).eq("id", traveler.id);
      if (error) {
        showNotice(`Your profile wasn't saved: ${error.message}`, "error");
        return;
      }
      setTravelers((current) => current.map((item) => item.id === traveler.id ? { ...item, name: nextName } : item));
    }
    localStorage.setItem("wayfare_profile_name", nextName);
    localStorage.setItem("wayfare_profile_home", profileDraft.home.trim());
    localStorage.setItem("wayfare_profile_bio", profileDraft.bio.trim());
    localStorage.setItem("wayfare_profile_currency", profileDraft.currency);
    localStorage.setItem(`wayfare_name_${tripId}`, nextName);
    setMe(nextName);
    const cloudResult = await account.saveProfile({ ...profileDraft, name: nextName, avatar: traveler?.avatar || "" });
    if (cloudResult.error) showNotice(`Saved on this device, but cloud sync failed: ${cloudResult.error.message}`, "error");
    else showNotice(account.user ? "Your personal profile was saved and synced." : "Your guest profile was saved on this device.");
  }

  async function addMember() {
    const name = memberName.trim();
    const manager = myTraveler();
    const canManage = manager?.role === "owner" || trip?.created_by === account.user?.id || travelers.length === 1;
    if (!canManage) return showNotice("Only the trip owner can add members directly.", "error");
    if (!name) return showNotice("Add your friend's name first.", "error");
    if (travelers.some((traveler) => traveler.name.toLowerCase() === name.toLowerCase())) return showNotice(`${name} is already in this group.`, "error");
    setMemberSaving(true);
    const { error } = await supabase.from("travelers").insert({ trip_id: tripId, name, role: "member" });
    setMemberSaving(false);
    if (error) return showNotice(`Couldn't add ${name}: ${error.message}`, "error");
    setMemberName("");
    showNotice(`${name} was added to ${tripDisplayName}.`);
    await load();
  }

  async function removeMember() {
    if (!memberToRemove || removingMember) return;
    setRemovingMember(true);
    const target = memberToRemove;
    const { error } = await supabase.from("travelers").delete().eq("id", target.id);
    setRemovingMember(false);
    if (error) return showNotice(`Couldn't remove ${target.name}. Remove or reassign anything they paid for first.`, "error");
    setMemberToRemove(null);
    showNotice(`${target.name} was removed from ${tripDisplayName}.`);
    await load();
  }

  async function ensureInviteLink() {
    if (inviteUrl) return inviteUrl;
    const manager = myTraveler();
    const canManage = manager?.role === "owner" || trip?.created_by === account.user?.id;
    if (!canManage) return "";
    setInviteLoading(true);
    const { data, error } = await supabase.rpc("create_or_get_trip_invite", { target_trip: tripId });
    setInviteLoading(false);
    if (error || !data) {
      showNotice(`Couldn't create a private invite: ${error?.message || "try again."}`, "error");
      return "";
    }
    const nextUrl = `${window.location.origin}/trip/${tripId}?invite=${data}`;
    setInviteUrl(nextUrl);
    return nextUrl;
  }

  async function openSharePanel() {
    setShareOpen(true);
    await ensureInviteLink();
  }

  async function copyInviteLink() {
    const secureInviteUrl = await ensureInviteLink();
    if (!secureInviteUrl) return;
    await navigator.clipboard.writeText(secureInviteUrl);
    showNotice("Invite link copied — send it to your group.");
  }

  async function shareInviteLink() {
    const secureInviteUrl = await ensureInviteLink();
    if (!secureInviteUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${tripDisplayName} on Wayfare`, text: `Sign in to join my private ${expenseOnly ? "expense group" : "trip plan"} on Wayfare.`, url: secureInviteUrl });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    await copyInviteLink();
  }

  function addActivityToCalendar(activity) {
    if (!activity.day_date) {
      switchTab("plan");
      showNotice("Add the trip dates in Trip details before exporting this activity.", "error");
      return;
    }
    downloadIcs(activity);
  }

  async function updateTripDuration(value) {
    const duration_days = Math.max(1, Math.min(30, Number(value) || 1));
    setTrip((current) => ({ ...current, duration_days }));
    const { error } = await supabase.from("trips").update({ duration_days }).eq("id", tripId);
    if (error) showNotice(`Trip length wasn't saved: ${error.message}`, "error");
    else showNotice(`Trip updated to ${duration_days} day${duration_days === 1 ? "" : "s"}.`);
  }

  async function updateTripDates() {
    const start_date = tripDateDraft.start || null;
    const end_date = tripDateDraft.end || null;
    if (start_date && end_date && end_date < start_date) {
      showNotice("The end date must be after the start date.", "error");
      return;
    }
    const duration_days = inclusiveTripDays(start_date, end_date) || tripDays;
    setTrip((current) => ({ ...current, start_date, end_date, duration_days }));
    const { error } = await supabase.from("trips").update({ start_date, end_date, duration_days }).eq("id", tripId);
    if (error) return showNotice(`Trip dates weren't saved: ${error.message}`, "error");
    const datedActivities = activities.map((activity) => {
      const dayIndex = Math.max(0, Number(String(activity.day_label || "Day 1").match(/\d+/)?.[0] || 1) - 1);
      return { ...activity, day_date: start_date ? tripDayISO(start_date, dayIndex) : null };
    });
    setActivities(datedActivities);
    await Promise.all(datedActivities.map((activity) => supabase.from("activities").update({ day_date: activity.day_date }).eq("id", activity.id)));
    showNotice(start_date ? "Trip dates and activity calendars were updated." : "Trip dates were cleared.");
  }

  async function castVote(activityId, value) {
    const traveler = myTraveler();
    if (!traveler) return;
    const existing = (votesByActivity[activityId] || []).find((v) => v.traveler_id === traveler.id);
    let result;
    if (existing && existing.value === value) {
      result = await supabase.from("votes").delete().eq("id", existing.id);
    } else if (existing) {
      result = await supabase.from("votes").update({ value }).eq("id", existing.id);
    } else {
      result = await supabase.from("votes").insert({ activity_id: activityId, traveler_id: traveler.id, value });
    }
    if (result?.error) showNotice(`Vote wasn't saved: ${result.error.message}`, "error");
    await load();
  }

  async function addComment(activityId, text) {
    const traveler = myTraveler();
    if (!traveler || !text.trim()) return;
    const { error } = await supabase.from("comments").insert({ activity_id: activityId, traveler_id: traveler.id, text: text.trim() });
    if (error) showNotice(`Comment wasn't saved: ${error.message}`, "error");
    await load();
  }

  async function updateActivity(id, fields) {
    setActivities((current) => current.map((activity) => activity.id === id ? { ...activity, ...fields } : activity));
    const { error } = await supabase.from("activities").update(fields).eq("id", id);
    if (error) showNotice(`Change wasn't saved: ${error.message}`, "error");
    await load();
  }

  async function deleteActivity() {
    if (!deleteTarget || deleting) return;
    const target = deleteTarget;
    setDeleting(true);
    const { error } = await supabase.from("activities").delete().eq("id", target.id);
    setDeleting(false);
    if (error) {
      showNotice(`Couldn't delete ${target.name}: ${error.message}`, "error");
      return;
    }
    setActivities((current) => current.filter((activity) => activity.id !== target.id));
    setDeleteTarget(null);
    showNotice(`${target.name} was deleted.`);
    await load();
  }

  async function deleteExtraCost(id) {
    if (!confirm("Remove this cost?")) return;
    const { error } = await supabase.from("extra_costs").delete().eq("id", id);
    if (error) showNotice(`Couldn't remove that cost: ${error.message}`, "error");
    await load();
  }

  async function addActivity(prefillName) {
    const label = newActivity.day_label.trim() || "Unscheduled";
    const activityName = (prefillName ?? newActivity.name).trim();
    if (!activityName) {
      setActivityError("Add an activity name first — for example, Sagrada Família tour.");
      addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setActivitySaving(true);
    setActivityError("");
    const parsedCost = parseFloat(String(newActivity.cost_pp || "").replace(/[^0-9.]/g, ""));
    const { data, error } = await supabase
      .from("activities")
      .insert({
        trip_id: tripId,
        day_label: label,
        day_date: newActivity.day_date || null,
        name: activityName,
        location: newActivity.location.trim() || null,
        latitude: newActivity.latitude,
        longitude: newActivity.longitude,
        time_text: newActivity.time_text.trim() || null,
        cost_pp: parsedCost > 0 ? parsedCost : 0,
        booking_info: newActivity.booking_info.trim() || null,
        sort_order: activities.length,
      })
      .select()
      .single();
    setActivitySaving(false);
    if (error) {
      setActivityError(`Couldn't add this activity: ${error.message || "please try again."}`);
      return;
    }
    if (data) {
      setActivities((current) => [...current.filter((activity) => activity.id !== data.id), data]);
      setJustAddedId(data.id);
    }
    setNewActivity({ ...newActivity, name: "", location: "", latitude: null, longitude: null, time_text: "", cost_pp: "", booking_info: "" });
    setAddOpen(false);
    showNotice(`${activityName} was added to ${tripDisplayName || "the plan"}.`);
    await load();
  }

  function calculateFormSplit(form = costForm) {
    const amount = roundMoney(parseFloat(String(form.amt || "").replace(/[^0-9.]/g, "")));
    const participants = travelers.filter((traveler) => form.participantIds.includes(traveler.id));
    if (!(amount > 0)) return { rows: [], error: "Enter an expense amount." };
    if (!participants.length) return { rows: [], error: "Choose at least one participant." };
    if (form.splitMethod === "exact") {
      const rows = participants.map((traveler) => ({ traveler_id: traveler.id, input_value: roundMoney(form.splitValues[traveler.id]), owed_amount: roundMoney(form.splitValues[traveler.id]) }));
      const entered = roundMoney(rows.reduce((sum, row) => sum + row.owed_amount, 0));
      return { rows, error: Math.round(entered * 100) !== Math.round(amount * 100) ? `Exact amounts must total ${form.currency} ${amount.toFixed(2)}.` : "" };
    }
    if (form.splitMethod === "percentage") {
      const entries = participants.map((traveler) => ({ traveler_id: traveler.id, weight: Number(form.splitValues[traveler.id]) || 0 }));
      const entered = roundMoney(entries.reduce((sum, entry) => sum + entry.weight, 0));
      const allocation = allocateByWeight(amount, entries);
      return { rows: allocation.map((entry) => ({ traveler_id: entry.traveler_id, input_value: entry.weight, owed_amount: entry.amount })), error: Math.abs(entered - 100) > 0.01 ? "Percentages must total 100%." : "" };
    }
    if (form.splitMethod === "shares") {
      const entries = participants.map((traveler) => ({ traveler_id: traveler.id, weight: Number(form.splitValues[traveler.id]) || 0 }));
      if (!entries.some((entry) => entry.weight > 0)) return { rows: [], error: "Enter at least one share." };
      const allocation = allocateByWeight(amount, entries);
      return { rows: allocation.map((entry) => ({ traveler_id: entry.traveler_id, input_value: entry.weight, owed_amount: entry.amount })), error: "" };
    }
    const allocation = allocateByWeight(amount, participants.map((traveler) => ({ traveler_id: traveler.id, weight: 1 })));
    return { rows: allocation.map((entry) => ({ traveler_id: entry.traveler_id, input_value: 1, owed_amount: entry.amount })), error: "" };
  }

  function changeSplitMethod(splitMethod) {
    const selected = travelers.filter((traveler) => costForm.participantIds.includes(traveler.id));
    const amount = roundMoney(costForm.amt);
    let splitValues = {};
    if (splitMethod === "exact") {
      allocateByWeight(amount, selected.map((traveler) => ({ traveler_id: traveler.id, weight: 1 }))).forEach((entry) => (splitValues[entry.traveler_id] = entry.amount));
    } else if (splitMethod === "percentage") {
      allocateByWeight(100, selected.map((traveler) => ({ traveler_id: traveler.id, weight: 1 }))).forEach((entry) => (splitValues[entry.traveler_id] = entry.amount));
    } else if (splitMethod === "shares") {
      selected.forEach((traveler) => (splitValues[traveler.id] = 1));
    }
    setCostForm((current) => ({ ...current, splitMethod, splitValues }));
  }

  function toggleExpenseParticipant(travelerId) {
    setCostForm((current) => {
      const included = current.participantIds.includes(travelerId);
      const participantIds = included ? current.participantIds.filter((id) => id !== travelerId) : [...current.participantIds, travelerId];
      const splitValues = { ...current.splitValues };
      if (included) delete splitValues[travelerId];
      else if (current.splitMethod === "shares") splitValues[travelerId] = 1;
      return { ...current, participantIds, splitValues };
    });
  }

  async function changeExpenseCurrency(nextCurrency) {
    setCostForm((current) => ({ ...current, currency: nextCurrency, exchangeRate: nextCurrency === currency ? "1" : current.exchangeRate }));
    if (nextCurrency === currency) return;
    setRateLoading(true);
    try {
      const response = await fetch(`https://api.frankfurter.dev/v2/rate/${nextCurrency}/${currency}?providers=ECB`);
      if (!response.ok) throw new Error("Rate unavailable");
      const payload = await response.json();
      if (!(Number(payload.rate) > 0)) throw new Error("Rate unavailable");
      setCostForm((current) => ({ ...current, exchangeRate: Number(payload.rate).toFixed(6).replace(/0+$/, "").replace(/\.$/, "") }));
    } catch {
      showNotice("Live exchange rate unavailable. Enter the rate manually.", "error");
    } finally {
      setRateLoading(false);
    }
  }

  async function chooseReceipt(file) {
    if (!file) return;
    try {
      const receiptData = await compressReceipt(file);
      setCostForm((current) => ({ ...current, receiptData }));
    } catch (error) {
      showNotice(error.message || "That receipt image couldn't be used.", "error");
    }
  }

  async function addExtraCost() {
    const val = roundMoney(parseFloat((costForm.amt || "").replace(/[^0-9.]/g, "")));
    const rate = Number(costForm.exchangeRate);
    const allocation = calculateFormSplit();
    if (!costForm.desc.trim() || !(val > 0) || !costForm.paidBy) {
      showNotice("Add a description, amount, and who paid.", "error");
      return;
    }
    if (costForm.currency !== currency && !(rate > 0)) {
      showNotice("Enter the exchange rate for this expense.", "error");
      return;
    }
    if (allocation.error) {
      showNotice(allocation.error, "error");
      return;
    }
    setCostSaving(true);
    const { data: expense, error } = await supabase.from("extra_costs").insert({
      trip_id: tripId,
      description: costForm.desc.trim(),
      amount: val,
      paid_by: costForm.paidBy,
      currency: costForm.currency,
      exchange_rate: costForm.currency === currency ? 1 : rate,
      split_method: costForm.splitMethod,
      notes: costForm.notes.trim() || null,
      receipt_data: costForm.receiptData || null,
    }).select().single();
    if (error || !expense) {
      setCostSaving(false);
      showNotice(`Expense wasn't added: ${error?.message || "please try again"}`, "error");
      return;
    }
    const { error: splitError } = await supabase.from("expense_splits").insert(allocation.rows.map((row) => ({ ...row, expense_id: expense.id })));
    if (splitError) {
      await supabase.from("extra_costs").delete().eq("id", expense.id);
      setCostSaving(false);
      showNotice(`Expense split wasn't saved: ${splitError.message}`, "error");
      return;
    }
    setCostSaving(false);
    setCostForm({ desc: "", amt: "", paidBy: costForm.paidBy, currency, exchangeRate: "1", splitMethod: "equal", participantIds: travelers.map((traveler) => traveler.id), splitValues: {}, notes: "", receiptData: "" });
    showNotice("Expense added with its split.");
    await load();
  }

  async function markTransferPaid(transfer) {
    if (settlementSaving) return;
    setSettlementSaving(true);
    const { error } = await supabase.from("settlements").insert({
      trip_id: tripId,
      from_traveler: transfer.fromId,
      to_traveler: transfer.toId,
      amount: roundMoney(transfer.amt),
      currency,
      note: "Marked paid in Wayfare",
      settled_at: new Date().toISOString(),
    });
    setSettlementSaving(false);
    if (error) showNotice(`Payment wasn't recorded: ${error.message}`, "error");
    else showNotice(`${transfer.from} paid ${transfer.to}.`);
    await load();
  }

  async function undoSettlement(settlementId) {
    const { error } = await supabase.from("settlements").delete().eq("id", settlementId);
    if (error) showNotice(`Payment couldn't be restored: ${error.message}`, "error");
    else showNotice("Payment moved back to outstanding balances.");
    await load();
  }

  function statusOf(activityId) {
    const votes = votesByActivity[activityId] || [];
    const up = votes.filter((v) => v.value === "up").length;
    const down = votes.filter((v) => v.value === "down").length;
    if (votes.length === 0) return "waiting";
    if (down > 0 && down >= up) return "contested";
    return "agreed";
  }

  const grouped = useMemo(() => {
    const g = activities.reduce((acc, a) => {
      const key = a.day_label || "Unscheduled";
      acc[key] = acc[key] || { date: a.day_date, items: [] };
      acc[key].items.push(a);
      if (a.day_date && (!acc[key].date || a.day_date < acc[key].date)) acc[key].date = a.day_date;
      return acc;
    }, {});
    return Object.entries(g).sort((a, b) => {
      if (a[1].date && b[1].date) return a[1].date.localeCompare(b[1].date);
      if (a[1].date) return -1;
      if (b[1].date) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [activities]);

  const counts = { agreed: 0, contested: 0, waiting: 0 };
  activities.forEach((a) => counts[statusOf(a.id)]++);

  const topActivityIdPerDay = useMemo(() => {
    const map = {};
    grouped.forEach(([label, group]) => {
      let best = null, bestScore = -Infinity;
      group.items.forEach((a) => {
        const votes = votesByActivity[a.id] || [];
        const score = votes.filter((v) => v.value === "up").length - votes.filter((v) => v.value === "down").length;
        if (votes.length > 0 && score > bestScore) { bestScore = score; best = a.id; }
      });
      if (best) map[label] = best;
    });
    return map;
  }, [grouped, votesByActivity]);

  const expenseDetails = extraCosts.map((cost) => {
    const savedSplits = expenseSplits[cost.id] || [];
    const expenseCurrency = savedSplits.length && CURRENCIES[cost.currency] ? cost.currency : currency;
    const rate = expenseCurrency === currency ? 1 : (Number(cost.exchange_rate) || 1);
    const baseAmount = roundMoney(Number(cost.amount) * rate);
    const allocations = savedSplits.length
      ? allocateByWeight(baseAmount, savedSplits.map((split) => ({ traveler_id: split.traveler_id, weight: Number(split.owed_amount) })))
      : allocateByWeight(baseAmount, travelers.map((traveler) => ({ traveler_id: traveler.id, weight: 1 })));
    return { ...cost, expenseCurrency, rate, baseAmount, allocations, savedSplits };
  });
  const itemsTotal = roundMoney(activities.reduce((sum, activity) => sum + (activity.cost_pp || 0) * travelers.length, 0));
  const extrasTotal = roundMoney(expenseDetails.reduce((sum, expense) => sum + expense.baseAmount, 0));
  const total = roundMoney(itemsTotal + extrasTotal);
  const share = travelers.length ? roundMoney(total / travelers.length) : 0;

  const paid = {};
  const owed = {};
  travelers.forEach((traveler) => {
    paid[traveler.id] = 0;
    owed[traveler.id] = 0;
  });
  activities.forEach((activity) => {
    const activityTotal = roundMoney(Number(activity.cost_pp || 0) * travelers.length);
    if (activityTotal > 0 && activity.paid_by) {
      paid[activity.paid_by] = roundMoney((paid[activity.paid_by] || 0) + activityTotal);
      allocateByWeight(activityTotal, travelers.map((traveler) => ({ traveler_id: traveler.id, weight: 1 }))).forEach((allocation) => {
        owed[allocation.traveler_id] = roundMoney((owed[allocation.traveler_id] || 0) + allocation.amount);
      });
    }
  });
  expenseDetails.forEach((expense) => {
    if (expense.paid_by) paid[expense.paid_by] = roundMoney((paid[expense.paid_by] || 0) + expense.baseAmount);
    expense.allocations.forEach((allocation) => {
      owed[allocation.traveler_id] = roundMoney((owed[allocation.traveler_id] || 0) + allocation.amount);
    });
  });
  settlements.forEach((settlement) => {
    const amount = roundMoney(settlement.amount);
    paid[settlement.from_traveler] = roundMoney((paid[settlement.from_traveler] || 0) + amount);
    paid[settlement.to_traveler] = roundMoney((paid[settlement.to_traveler] || 0) - amount);
  });
  const balances = travelers.map((traveler) => ({ id: traveler.id, name: traveler.name, net: roundMoney((paid[traveler.id] || 0) - (owed[traveler.id] || 0)) }));
  const debtors = balances.filter((balance) => balance.net < -0.009).map((balance) => ({ ...balance, amt: -balance.net })).sort((a, b) => b.amt - a.amt);
  const creditors = balances.filter((balance) => balance.net > 0.009).map((balance) => ({ ...balance, amt: balance.net })).sort((a, b) => b.amt - a.amt);
  const transfers = [];
  {
    let di = 0, ci = 0;
    const dcopy = debtors.map((d) => ({ ...d }));
    const ccopy = creditors.map((c) => ({ ...c }));
    while (di < dcopy.length && ci < ccopy.length) {
      const amt = roundMoney(Math.min(dcopy[di].amt, ccopy[ci].amt));
      transfers.push({ from: dcopy[di].name, fromId: dcopy[di].id, to: ccopy[ci].name, toId: ccopy[ci].id, amt });
      dcopy[di].amt -= amt; ccopy[ci].amt -= amt;
      if (dcopy[di].amt < 0.009) di++;
      if (ccopy[ci].amt < 0.009) ci++;
    }
  }

  const expenseOnly = isExpenseGroupName(trip?.name);
  const tripDisplayName = displayGroupName(trip?.name);
  const tripDays = Math.max(1, Number(trip?.duration_days) || 3);
  const dayOptions = Array.from({ length: tripDays }, (_, index) => `Day ${index + 1}`);
  const myBalance = balances.find((b) => b.id === myTraveler()?.id);
  const money = (value, decimals = 2) => `${CURRENCIES[currency].symbol}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  const moneyIn = (value, code, decimals = 2) => `${CURRENCIES[code]?.symbol || `${code} `}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  const formSplitPreview = calculateFormSplit();
  const updateFeed = useMemo(() => {
    const feed = [];
    activities.forEach((activity) => feed.push({
      id: `activity-${activity.id}`,
      date: activity.created_at,
      icon: "✦",
      title: activity.name,
      text: "New activity suggestion",
    }));
    Object.entries(votesByActivity).forEach(([activityId, votes]) => votes.forEach((vote) => {
      const activity = activities.find((item) => item.id === activityId);
      const traveler = travelers.find((item) => item.id === vote.traveler_id);
      const label = vote.value === "up" ? "voted good" : vote.value === "meh" ? "voted maybe" : "voted skip";
      feed.push({ id: `vote-${vote.id}`, date: vote.created_at, icon: "✓", title: activity?.name || "Activity", text: `${traveler?.name || "Someone"} ${label}` });
    }));
    Object.entries(commentsByActivity).forEach(([activityId, comments]) => comments.forEach((comment) => {
      const activity = activities.find((item) => item.id === activityId);
      feed.push({ id: `comment-${comment.id}`, date: comment.created_at, icon: "“", title: activity?.name || "Activity", text: `${comment.travelers?.name || "Someone"}: ${comment.text}` });
    }));
    extraCosts.forEach((cost) => feed.push({ id: `cost-${cost.id}`, date: cost.created_at, icon: "⇄", title: cost.description, text: `${cost.travelers?.name || "Someone"} added ${moneyIn(cost.amount, CURRENCIES[cost.currency] ? cost.currency : currency)}` }));
    settlements.forEach((settlement) => {
      const from = travelers.find((traveler) => traveler.id === settlement.from_traveler);
      const to = travelers.find((traveler) => traveler.id === settlement.to_traveler);
      feed.push({ id: `settlement-${settlement.id}`, date: settlement.settled_at || settlement.created_at, icon: "✓", title: "Payment settled", text: `${from?.name || "Someone"} paid ${to?.name || "someone"} ${money(settlement.amount)}` });
    });
    return feed.sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 30);
  }, [activities, votesByActivity, commentsByActivity, extraCosts, settlements, travelers, currency]);

  if (account.loading || accessState === "loading") return <main className="auth-shell"><div className="auth-loading"><div className="brand-mark dark">WAYFARE</div><p>Opening your private plan…</p></div></main>;

  if (!account.user) {
    return (
      <main className="auth-shell"><section className="auth-welcome invite-auth-welcome"><button type="button" className="auth-back-button" onClick={() => router.push("/")}>← Back</button><div className="brand-mark dark">WAYFARE</div><span className="eyebrow">Private invitation</span><h1>{inviteToken ? "A friend invited you to plan together." : "Sign in to open this plan."}</h1><p>Only authenticated members can see activities, votes, and shared expenses.</p><AccountPanel account={account} displayName={nameInput} redirectTo={typeof window === "undefined" ? undefined : window.location.href} /></section></main>
    );
  }

  if (accessState === "denied" || !trip) return <main className="auth-shell"><section className="auth-welcome access-denied-card"><button type="button" className="auth-back-button" onClick={() => router.push("/")}>← Back to plans</button><div className="brand-mark dark">WAYFARE</div><span className="eyebrow">Private plan</span><h1>You don’t have access.</h1><p>{accessError || "Ask the owner to send you a secure invite link."}</p></section></main>;

  const currentTraveler = myTraveler();
  const canManageMembers = currentTraveler?.role === "owner" || trip?.created_by === account.user?.id || travelers.length === 1;
  const usedNames = new Set(activities.map((a) => a.name.toLowerCase()));
  const suggestionsToShow = SUGGESTIONS.filter((s) => !usedNames.has(s.name.toLowerCase())).slice(0, 6);

  return (
    <div className="trip-shell">
      <div className="trip-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(9,22,25,.08), rgba(9,22,25,.86)), url(${destinationPhotos[heroPhotoIndex] || destinationInfo(tripDisplayName).photos[0]})` }}>
        <div className="hero-nav"><button type="button" className="all-plans-back hero-back" onClick={() => router.push(expenseOnly ? "/?view=settle" : "/")}><span aria-hidden="true">←</span> {expenseOnly ? "All groups" : "All plans"}</button><span className="trip-wordmark">WAYFARE</span><button className="share-btn" onClick={openSharePanel}><Icon name="arrow" style={{ width: 14, height: 14 }} />{canManageMembers ? "Invite friends" : "Members"}</button></div>
        <div className="hero-content">
          <div className="eyebrow hero-eyebrow">{expenseOnly ? "Shared expense group" : "Trip plan"}</div>
          <h1>{tripDisplayName}</h1>
          <div className="hero-meta">
            <span className="traveler-stack">{travelers.slice(0, 5).map((t) => <Avatar key={t.id} name={t.name} avatar={t.avatar} size={28} />)}</span>
            <span>{travelers.length} {expenseOnly ? `member${travelers.length === 1 ? "" : "s"}` : `traveler${travelers.length === 1 ? "" : "s"}`}</span>{!expenseOnly && <><span>•</span><span>{formatTripRange(trip.start_date, trip.end_date)}</span></>}<span>•</span><span>{expenseOnly ? `${extraCosts.length} expense${extraCosts.length === 1 ? "" : "s"}` : `${activities.length} ideas`}</span><span>•</span><span>{expenseOnly ? `${money(total)} shared` : `${money(share)} each so far`}</span>
          </div>
          {!expenseOnly && destinationPhotos.length > 1 && <div className="destination-photo-strip" aria-label={`${tripDisplayName} photos`}>{destinationPhotos.slice(0, 6).map((photo, index) => <button key={photo} className={heroPhotoIndex === index ? "active" : ""} aria-label={`Show destination photo ${index + 1}`} style={{ backgroundImage: `url(${photo})` }} onClick={() => setHeroPhotoIndex(index)} />)}</div>}
        </div>
      </div>

      <div className="wrap trip-wrap">
      <header className="trip-view-header">
        <div className="eyebrow">{activeTab === "plan" ? `${tripDisplayName} itinerary` : activeTab === "settle" ? `${tripDisplayName} expenses` : activeTab === "updates" ? `${tripDisplayName} activity` : "Profile & settings"}</div>
        <h2>{activeTab === "plan" ? "Activities & ideas" : activeTab === "settle" ? "Settle up" : activeTab === "updates" ? "Updates" : "You"}</h2>
      </header>

      {activeTab === "plan" && <div className="trip-summary">
        <div><strong>{counts.agreed}</strong><span>Approved</span></div>
        <div><strong>{counts.contested}</strong><span>Needs a vote</span></div>
        <div><strong>{counts.waiting}</strong><span>New ideas</span></div>
        <div className="summary-budget"><strong>{money(share)}</strong><span>Estimated per person</span></div>
      </div>}

      {activeTab === "plan" && !expenseOnly && <details className="trip-details-card">
        <summary><div><span className="eyebrow">Trip administration</span><strong>Trip details</strong><small>Dates, duration, currency, and travelers</small></div><b>Edit</b></summary>
        <div className="trip-details-body">
          <label className="field-label">Trip currency</label>
          <select aria-label="Trip currency" className="settings-select" value={currency} onChange={(event) => { const next = event.target.value; setCurrency(next); localStorage.setItem(`wayfare_currency_${tripId}`, next); supabase.from("trips").update({ currency: next }).eq("id", tripId).then(() => {}); }}>{Object.entries(CURRENCIES).map(([code, item]) => <option key={code} value={code}>{code} · {item.symbol.trim()}</option>)}</select>
          <label className="field-label">Trip dates</label>
          <div className="trip-profile-dates">
            <label><span>Starts</span><input type="date" value={tripDateDraft.start} onChange={(event) => setTripDateDraft((current) => ({ ...current, start: event.target.value, end: current.end && current.end < event.target.value ? "" : current.end }))} /></label>
            <label><span>Ends</span><input type="date" min={tripDateDraft.start || undefined} value={tripDateDraft.end} disabled={!tripDateDraft.start} onChange={(event) => setTripDateDraft((current) => ({ ...current, end: event.target.value }))} /></label>
            <button type="button" onClick={updateTripDates}>Save dates</button>
          </div>
          <label className="field-label">Trip duration</label>
          <div className="profile-duration-control"><input key={tripDays} aria-label="Trip duration in days" type="number" min="1" max="30" defaultValue={tripDays} onBlur={(event) => updateTripDuration(event.target.value)} /><span>days · creates Day 1 to Day {tripDays}</span></div>
          <div className="profile-members"><div className="field-label">Travelers</div>{travelers.map((traveler) => <span key={traveler.id}><Avatar name={traveler.name} avatar={traveler.avatar} size={24} />{traveler.name}{traveler.role === "owner" && <small>Owner</small>}</span>)}</div>
          <button type="button" className="manage-members-button" onClick={openSharePanel}>{canManageMembers ? "Invite or manage travelers" : "View travelers"}</button>
        </div>
      </details>}

      {activeTab === "plan" && !expenseOnly && <div className="trip-day-planner"><div className="trip-day-planner-head"><div><span className="eyebrow">{tripDays}-day trip</span><strong>Choose a day to add an activity</strong></div><small>{trip.start_date ? formatTripRange(trip.start_date, trip.end_date) : "Add dates from Trip details whenever you are ready"}</small></div><div className="trip-day-buttons">{dayOptions.map((day, index) => { const count = activities.filter((activity) => (activity.day_label || "Day 1") === day).length; const dateText = formatTripDayDate(trip.start_date, index); return <button key={day} onClick={() => { setNewActivity((current) => ({ ...current, day_label: day, day_date: tripDayISO(trip.start_date, index) || current.day_date })); setAddOpen(true); setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }}><strong>{day}</strong><small>{dateText ? `${dateText} · ` : ""}{count} activit{count === 1 ? "y" : "ies"}</small></button>; })}</div></div>}

      <section className={activeTab === "plan" ? "tab-panel" : "tab-panel is-hidden"}>
      <div className="pass legacy-pass">
        <div className="pass-top">
          <div>
            <div className="eyebrow">Boarding · Group trip</div>
            <h1>{tripDisplayName}</h1>
            <div className="pass-dates">
              <span className="traveler-stack">
                {travelers.slice(0, 5).map((t) => <Avatar key={t.id} name={t.name} avatar={t.avatar} size={22} />)}
              </span>
              {travelers.length} traveler{travelers.length === 1 ? "" : "s"} · you're {me}
            </div>
          </div>
          <button className="share-btn" onClick={openSharePanel}>
            <Icon name="pin" style={{ width: 14, height: 14 }} />Share
          </button>
        </div>
        <div className="stub">
          <div><div className="lab">Agreed</div><div className="val val-agreed">{counts.agreed}</div></div>
          <div><div className="lab">Contested</div><div className="val val-contested">{counts.contested}</div></div>
          <div><div className="lab">Waiting</div><div className="val val-waiting">{counts.waiting}</div></div>
        </div>
      </div>

      {!expenseOnly && (
        <section className="map-workspace" aria-label="Map and timeline planner">
          <div className="map-workspace-head">
            <div><span className="eyebrow">Your trip, together</span><h3>The group plan</h3><p>Collect ideas, have your say, and see it all on the map.</p></div>
            <div className="plan-view-toggle" role="group" aria-label="Itinerary view">
              <button type="button" className={planView === "timeline" ? "active" : ""} onClick={() => setPlanView("timeline")}>Timeline</button>
              <button type="button" className={planView === "map" ? "active" : ""} onClick={() => setPlanView("map")}><Icon name="pin" />Map</button>
              <button type="button" className={planView === "polls" ? "active" : ""} onClick={() => setPlanView("polls")}>Group votes</button>
            </div>
          </div>
          {planView === "map" && <>
            <div className="map-day-filter" aria-label="Filter map by day">
              {["All days", ...dayOptions].map((day) => <button type="button" key={day} className={mapDay === day ? "active" : ""} onClick={() => setMapDay(day)}>{day}</button>)}
            </div>
            <TripMap
              activities={activities}
              selectedDay={mapDay}
              statusFor={statusOf}
              onActivitySelect={(activityId) => {
                setPlanView("timeline");
                setTimeout(() => itemRefs.current[activityId]?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
              }}
            />
          </>}
        </section>
      )}

      {planView === "polls" && <ActivityPolls activities={activities} votesByActivity={votesByActivity} travelers={travelers} travelerId={currentTraveler?.id} onVote={castVote} onAdd={() => { setAddOpen(true); setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }} onView={(id) => { setPlanView("timeline"); setTimeout(() => itemRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 100); }} />}

      {activities.length === 0 && planView === "timeline" && (
        <div className="empty-state">
          <Icon name="sparkle" style={{ width: 22, height: 22, opacity: 0.5 }} />
          <div className="empty-title">No activities yet</div>
          <div className="empty-sub">Create the first proposal, then invite friends to vote.</div>
          <button className="empty-primary" onClick={() => setAddOpen(true)}>Create an activity</button>
          <div className="suggestion-row">
            {SUGGESTIONS.slice(0, 5).map((s) => (
              <button key={s.name} className="suggestion-chip" onClick={() => addActivity(s.name)}>
                <Icon name="plus" style={{ width: 11, height: 11 }} />{s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {planView === "timeline" && grouped.map(([dayLabel, group]) => {
        const items = group.items;
        const topId = topActivityIdPerDay[dayLabel];
        return (
          <div key={dayLabel}>
            <div className="day-label-row">
              <span className="day-label">{dayLabel}</span>
              {group.date && <span className="day-date">{fmtDay(group.date, "")}</span>}
            </div>
            {items.map((a) => {
              const votes = votesByActivity[a.id] || [];
              const myVote = votes.find((v) => v.traveler_id === myTraveler()?.id)?.value;
              const up = votes.filter((v) => v.value === "up").length;
              const meh = votes.filter((v) => v.value === "meh").length;
              const down = votes.filter((v) => v.value === "down").length;
              const status = statusOf(a.id);
              const comments = commentsByActivity[a.id] || [];
              const isTop = a.id === topId && up > 0;
              const isJustAdded = a.id === justAddedId;
              const editableLocation = a.location === "Add exact location" ? "" : (a.location || "");
              const editableTime = a.time_text === "Add time" ? "" : (a.time_text || "");
              return (
                <div
                  className={`item${isJustAdded ? " item-flash" : ""}`}
                  key={a.id}
                  ref={(el) => (itemRefs.current[a.id] = el)}
                >
                  <div className="item-top">
                    <span className="item-name">
                      {isTop && <span className="top-pick" title="Group favorite"><Icon name="star" style={{ width: 12, height: 12 }} /></span>}
                      {a.name}
                    </span>
                    <div className="item-top-right">
                      <span className={`item-badge b-${status}`}>{status[0].toUpperCase() + status.slice(1)}</span>
                      <button className="icon-btn delete-activity-btn" title="Remove activity" onClick={() => setDeleteTarget(a)}>
                        <Icon name="trash" style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>
                  <div className="item-meta activity-editors">
                    <div className="inline-field inline-location-field"><Icon name="pin" /><PlacePicker compact value={editableLocation} tripName={tripDisplayName} onCommit={(location, place) => {
                      geocodingRef.current.delete(a.id);
                      updateActivity(a.id, { location: location || null, latitude: place.latitude, longitude: place.longitude });
                    }} /></div>
                    <label className="inline-field inline-cost-field"><Icon name="coin" /><span className="currency-prefix">{CURRENCIES[currency].symbol}</span><input key={`cost-${a.id}-${a.cost_pp || 0}`} aria-label="Cost per person" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={a.cost_pp || ""} placeholder="0" onFocus={(event) => event.currentTarget.select()} onBlur={(event) => { const value = parseFloat(event.target.value); updateActivity(a.id, { cost_pp: value > 0 ? value : 0 }); }} /><small>pp</small></label>
                    <label className="inline-field inline-time-field"><Icon name="clock" /><select aria-label="Activity time" value={editableTime} onChange={(event) => updateActivity(a.id, { time_text: event.target.value || null })}><option value="">Add time</option>{editableTime && !TIME_OPTIONS.includes(editableTime) && <option value={editableTime}>{editableTime}</option>}{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
                    {a.cost_pp > 0 && (
                      <select aria-label={`Who paid for ${a.name}`} className="paid-select" value={a.paid_by || ""} onChange={(e) => updateActivity(a.id, { paid_by: e.target.value || null })}>
                        <option value="">who paid?</option>
                        {travelers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="vote-row">
                    <button className={`vbtn ${myVote === "up" ? "active-up" : ""}`} onClick={() => castVote(a.id, "up")}><Icon name="up" />Good{up > 0 ? ` (${up})` : ""}</button>
                    <button className={`vbtn ${myVote === "meh" ? "active-meh" : ""}`} onClick={() => castVote(a.id, "meh")}><Icon name="meh" />Meh{meh > 0 ? ` (${meh})` : ""}</button>
                    <button className={`vbtn ${myVote === "down" ? "active-down" : ""}`} onClick={() => castVote(a.id, "down")}><Icon name="down" />Skip{down > 0 ? ` (${down})` : ""}</button>
                  </div>
                  {votes.length > 0 && (
                    <div className="voter-avatars">
                      {votes.map((v) => {
                        const t = travelers.find((tr) => tr.id === v.traveler_id);
                        if (!t) return null;
                        return <span key={v.id} className={`voter-dot vd-${v.value}`}><Avatar name={t.name} avatar={t.avatar} size={18} /></span>;
                      })}
                    </div>
                  )}
                  {comments.length > 0 && (
                    <div className="comment-list">
                      {comments.map((c) => <div className="comment" key={c.id}><b>{c.travelers?.name || "Someone"}:</b> {c.text}</div>)}
                    </div>
                  )}
                  <input className="comment-input" placeholder="Add a comment (optional)" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { addComment(a.id, e.target.value); e.target.value = ""; } }} />
                  <div className="item-actions">
                    <a className="cal-btn map-action" href={mapsUrl(a)} target="_blank" rel="noreferrer"><Icon name="pin" />Open in Maps</a>
                    <button className="cal-btn" onClick={() => addActivityToCalendar(a)} title={a.day_date ? "Download calendar event" : "Add trip dates first"}><Icon name="cal" />{a.day_date ? "Add to calendar" : "Set dates for calendar"}</button>
                    <a className="cal-btn book-action" href={bookingUrl(a, tripDisplayName)} target="_blank" rel="noreferrer">Find tickets <Icon name="arrow" /></a>
                  </div>
                  <div className="booking">
                    <input placeholder="Save booking link or confirmation number" defaultValue={a.booking_info || ""} onBlur={(e) => updateActivity(a.id, { booking_info: e.target.value })} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {planView === "timeline" && activities.length > 0 && suggestionsToShow.length > 0 && (
        <div className="suggestion-block">
          <div className="field-label" style={{ marginBottom: 8 }}>Need ideas? Quick-add a suggestion</div>
          <div className="suggestion-row">
            {suggestionsToShow.map((s) => (
              <button key={s.name} className="suggestion-chip" onClick={() => addActivity(s.name)}>
                <Icon name="plus" style={{ width: 11, height: 11 }} />{s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {addOpen && <>
      <div className="sec-head"><h2>Create an activity</h2><button className="close-composer" onClick={() => setAddOpen(false)}>Close</button></div>
      <div className="home-card activity-composer" ref={addFormRef}>
        <div className="composer-head"><div><div className="eyebrow">New plan idea</div><h3>What should the group do?</h3></div><span className="optional-note">Location and price are optional</span></div>
        <label className="field-label">Activity <b>required</b></label>
        <input className={activityError && !newActivity.name.trim() ? "input-error" : ""} placeholder="e.g. Sagrada Família tour" value={newActivity.name} onChange={(e) => { setNewActivity({ ...newActivity, name: e.target.value }); setActivityError(""); }} />
        <div className="composer-grid">
          <div><label className="field-label">Day</label><select className="time-select" aria-label="Activity day" value={newActivity.day_label} onChange={(e) => setNewActivity({ ...newActivity, day_label: e.target.value })}>{newActivity.day_label && !dayOptions.includes(newActivity.day_label) && <option value={newActivity.day_label}>{newActivity.day_label} (outside trip length)</option>}{dayOptions.map((day) => <option key={day} value={day}>{day}</option>)}</select></div>
          <div><label className="field-label">Date</label><input aria-label="Activity date" type="date" value={newActivity.day_date} onChange={(e) => setNewActivity({ ...newActivity, day_date: e.target.value })} /></div>
          <div><label className="field-label">Time</label><select aria-label="Activity time" className="time-select" value={newActivity.time_text} onChange={(e) => setNewActivity({ ...newActivity, time_text: e.target.value })}><option value="">Select a time</option>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></div>
          <div><label className="field-label">Cost per person</label><div className="composer-money-input"><span>{CURRENCIES[currency].symbol}</span><input aria-label="New activity cost per person" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0" value={newActivity.cost_pp} onFocus={(event) => event.currentTarget.select()} onChange={(e) => setNewActivity({ ...newActivity, cost_pp: e.target.value })} /></div></div>
        </div>
        <label className="field-label">Location <span>optional</span></label>
        <div className="location-field-row">
          <PlacePicker
            value={newActivity.location}
            tripName={tripDisplayName}
            onValueChange={(location) => setNewActivity((current) => ({ ...current, location, latitude: null, longitude: null }))}
            onCommit={(location, place) => setNewActivity((current) => ({ ...current, location, latitude: place.latitude, longitude: place.longitude }))}
          />
          <a className={`map-check ${newActivity.location.trim() ? "" : "disabled"}`} href={newActivity.location.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(newActivity.location)}` : undefined} target="_blank" rel="noreferrer">Check Maps</a>
        </div>
        <label className="field-label">Booking link or confirmation <span>optional</span></label>
        <input placeholder="Paste a Klook, museum, tour, or ticket link" value={newActivity.booking_info} onChange={(e) => setNewActivity({ ...newActivity, booking_info: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addActivity()} />
        {activityError && <p className="form-error composer-error">{activityError}</p>}
        <button className="primary-add" onClick={() => addActivity()} disabled={activitySaving}><Icon name="plus" style={{ width: 13, height: 13, marginRight: 6 }} />{activitySaving ? "Adding…" : "Add to the plan"}</button>
      </div>
      </>}
      </section>

      <section className={activeTab === "settle" ? "tab-panel" : "tab-panel is-hidden"}>
      {expenseOnly && <div className="expense-only-banner"><span>⌂</span><div><strong>Everyday expense group</strong><p>No itinerary needed. Add supermarket runs, rent, dinners, or anything the group shares.</p></div></div>}
      <div className="sec-head"><h2>Costs so far</h2></div>
      <div className="cost-card">
        <div className="cost-total">
          <div><div className="num">{money(total)}</div><div className="lab">total, all items + extras</div></div>
          <div style={{ textAlign: "right" }}><div className="num">{money(share)}</div><div className="lab">per traveler</div></div>
        </div>
        <div className="cost-sub">{expenseOnly ? `${money(extrasTotal)} in shared expenses` : `${money(itemsTotal)} from activities · ${money(extrasTotal)} in extras`}</div>
        {activities.filter((a) => a.cost_pp > 0).map((a) => {
          const payer = travelers.find((t) => t.id === a.paid_by);
          return (
            <div className="ledger-row" key={a.id}>
              <span className="ledger-name">
                {a.name} <span className="ledger-sub">— {money(a.cost_pp, 2)} pp{payer ? ` · paid by ${payer.name}` : ""}</span>
              </span>
              <span className="ledger-amt">{money(a.cost_pp * travelers.length)}</span>
            </div>
          );
        })}
        {expenseDetails.map((expense) => {
          const participantNames = expense.allocations.map((allocation) => travelers.find((traveler) => traveler.id === allocation.traveler_id)?.name).filter(Boolean);
          return (
            <div className="ledger-row expense-ledger-row" key={expense.id}>
              <span className="ledger-name">
                <span className="expense-title-line">{expense.description}{expense.receipt_data && <a className="receipt-link" href={expense.receipt_data} target="_blank" rel="noreferrer">Receipt</a>}</span>
                <span className="ledger-sub">Paid by {expense.travelers?.name || "someone"} · {SPLIT_METHODS[expense.split_method]?.label || "Equal"} split · {participantNames.join(", ") || "everyone"}</span>
                {expense.notes && <span className="expense-note">{expense.notes}</span>}
              </span>
              <span className="ledger-row-right">
                <span className="expense-ledger-amounts"><b>{moneyIn(expense.amount, expense.expenseCurrency)}</b>{expense.expenseCurrency !== currency && <small>{money(expense.baseAmount)} total</small>}</span>
                <button className="icon-btn" title="Remove cost" onClick={() => deleteExtraCost(expense.id)}><Icon name="trash" style={{ width: 12, height: 12 }} /></button>
              </span>
            </div>
          );
        })}
        {activities.filter((a) => a.cost_pp > 0).length === 0 && extraCosts.length === 0 && (
          <div className="ledger-empty">{expenseOnly ? "No expenses yet — add the first shared purchase below." : "No costs logged yet — add one below, or set a cost on an activity above."}</div>
        )}
        <div className="expense-composer">
          <div className="expense-composer-head"><div><span className="eyebrow">New shared purchase</span><h3>Add an expense</h3></div><span>Split it your way</span></div>
          <div className="expense-basic-grid">
            <label><span className="field-label">Description</span><input aria-label="Expense description" placeholder="e.g. Supermarket" value={costForm.desc} onChange={(event) => setCostForm({ ...costForm, desc: event.target.value })} /></label>
            <label><span className="field-label">Who paid?</span><select className="paid-select" value={costForm.paidBy} onChange={(event) => setCostForm({ ...costForm, paidBy: event.target.value })}><option value="">Choose payer</option>{travelers.map((traveler) => <option key={traveler.id} value={traveler.id}>{traveler.name}</option>)}</select></label>
          </div>
          <div className="expense-money-grid">
            <label><span className="field-label">Amount</span><div className="expense-amount-input"><span>{CURRENCIES[costForm.currency]?.symbol}</span><input aria-label="Expense amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" value={costForm.amt} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setCostForm({ ...costForm, amt: event.target.value })} /></div></label>
            <label><span className="field-label">Currency</span><select value={costForm.currency} onChange={(event) => changeExpenseCurrency(event.target.value)}>{Object.entries(CURRENCIES).map(([code, item]) => <option key={code} value={code}>{code} · {item.label}</option>)}</select></label>
          </div>
          {costForm.currency !== currency && <div className="exchange-rate-row"><div><strong>Convert to {currency}</strong><small>{rateLoading ? "Getting today’s ECB rate…" : `1 ${costForm.currency} equals how many ${currency}?`}</small></div><input aria-label={`Exchange rate from ${costForm.currency} to ${currency}`} type="number" min="0" step="0.000001" inputMode="decimal" value={costForm.exchangeRate} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setCostForm({ ...costForm, exchangeRate: event.target.value })} /><button type="button" onClick={() => changeExpenseCurrency(costForm.currency)} disabled={rateLoading}>Refresh</button></div>}

          <div className="expense-subhead"><div><strong>Split between</strong><small>{costForm.participantIds.length} of {travelers.length} selected</small></div><button type="button" onClick={() => setCostForm((current) => ({ ...current, participantIds: travelers.map((traveler) => traveler.id) }))}>Select all</button></div>
          <div className="expense-participants">{travelers.map((traveler) => { const selected = costForm.participantIds.includes(traveler.id); return <button type="button" key={traveler.id} className={selected ? "selected" : ""} onClick={() => toggleExpenseParticipant(traveler.id)}><Avatar name={traveler.name} avatar={traveler.avatar} size={25} /><span>{traveler.name}</span><b>{selected ? "✓" : "+"}</b></button>; })}</div>

          <div className="expense-subhead"><div><strong>How should it split?</strong><small>Amounts are rounded to the cent</small></div></div>
          <div className="split-methods">{Object.entries(SPLIT_METHODS).map(([method, item]) => <button type="button" key={method} className={costForm.splitMethod === method ? "active" : ""} onClick={() => changeSplitMethod(method)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}</div>
          <div className="split-preview">{travelers.filter((traveler) => costForm.participantIds.includes(traveler.id)).map((traveler) => { const preview = formSplitPreview.rows.find((row) => row.traveler_id === traveler.id); const editable = costForm.splitMethod !== "equal"; const suffix = costForm.splitMethod === "percentage" ? "%" : costForm.splitMethod === "shares" ? "shares" : costForm.currency; return <div className="split-person" key={traveler.id}><span><Avatar name={traveler.name} avatar={traveler.avatar} size={24} />{traveler.name}</span>{editable ? <label><input aria-label={`${traveler.name} ${costForm.splitMethod}`} type="number" min="0" step={costForm.splitMethod === "shares" ? "1" : "0.01"} inputMode="decimal" value={costForm.splitValues[traveler.id] ?? ""} placeholder="0" onFocus={(event) => event.currentTarget.select()} onChange={(event) => setCostForm((current) => ({ ...current, splitValues: { ...current.splitValues, [traveler.id]: event.target.value } }))} /><small>{suffix}</small></label> : <b>{moneyIn(preview?.owed_amount || 0, costForm.currency)}</b>}<em>{editable && preview ? `owes ${moneyIn(preview.owed_amount, costForm.currency)}` : ""}</em></div>; })}</div>
          {formSplitPreview.error && Number(costForm.amt) > 0 && <div className="split-error">{formSplitPreview.error}</div>}

          <label className="expense-notes"><span className="field-label">Notes <i>optional</i></span><textarea rows="2" placeholder="What was this for?" value={costForm.notes} onChange={(event) => setCostForm({ ...costForm, notes: event.target.value })} /></label>
          <div className="receipt-picker"><label><span>{costForm.receiptData ? "✓ Receipt attached" : "＋ Add receipt photo"}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseReceipt(event.target.files?.[0])} /></label>{costForm.receiptData && <><img src={costForm.receiptData} alt="Receipt preview" /><button type="button" onClick={() => setCostForm({ ...costForm, receiptData: "" })}>Remove</button></>}</div>
          <button className="add-expense-button" onClick={addExtraCost} disabled={costSaving}>{costSaving ? "Saving expense…" : `Add expense${Number(costForm.amt) > 0 ? ` · ${moneyIn(costForm.amt, costForm.currency)}` : ""}`}</button>
        </div>
      </div>
      </section>

      <section className={activeTab === "settle" ? "tab-panel" : "tab-panel is-hidden"}>
      {expenseOnly && <details className="trip-details-card expense-group-details">
        <summary><div><span className="eyebrow">Group administration</span><strong>Group details</strong><small>Currency and members</small></div><b>Edit</b></summary>
        <div className="trip-details-body">
          <label className="field-label">Group currency</label>
          <select aria-label="Group currency" className="settings-select" value={currency} onChange={(event) => { const next = event.target.value; setCurrency(next); localStorage.setItem(`wayfare_currency_${tripId}`, next); supabase.from("trips").update({ currency: next }).eq("id", tripId).then(() => {}); }}>{Object.entries(CURRENCIES).map(([code, item]) => <option key={code} value={code}>{code} · {item.symbol.trim()}</option>)}</select>
          <div className="profile-members"><div className="field-label">Members</div>{travelers.map((traveler) => <span key={traveler.id}><Avatar name={traveler.name} avatar={traveler.avatar} size={24} />{traveler.name}{traveler.role === "owner" && <small>Owner</small>}</span>)}</div>
          <button type="button" className="manage-members-button" onClick={openSharePanel}>{canManageMembers ? "Invite or manage members" : "View members"}</button>
        </div>
      </details>}
      <div className="sec-head"><h2>Settle up</h2></div>
      <div className="settle-card">
        {myBalance && (
          <div className={`settle-headline ${myBalance.net > 0.009 ? "sh-pos" : myBalance.net < -0.009 ? "sh-neg" : "sh-zero"}`}>
            {myBalance.net > 0.009 && <>You're owed <b>{money(myBalance.net)}</b> overall</>}
            {myBalance.net < -0.009 && <>You owe <b>{money(Math.abs(myBalance.net))}</b> overall</>}
            {myBalance.net >= -0.009 && myBalance.net <= 0.009 && <>You're all settled up</>}
          </div>
        )}
        {balances.map((b) => (
          <div className="balance-row" key={b.id}>
            <span className="ledger-name balance-name"><Avatar name={b.name} avatar={travelers.find((traveler) => traveler.id === b.id)?.avatar} size={22} />{b.name}</span>
            <span className={b.net > 0.009 ? "balance-pos" : b.net < -0.009 ? "balance-neg" : "balance-zero"}>
              {b.net > 0.009 ? `gets back ${money(b.net)}` : b.net < -0.009 ? `owes ${money(Math.abs(b.net))}` : "settled"}
            </span>
          </div>
        ))}
        <div className="settle-divider">Who pays whom <span className="simplified-badge">simplified</span></div>
        {transfers.length === 0 ? (
          <div className="ledger-empty">Everyone's square.</div>
        ) : transfers.map((t, i) => (
          <div className="transfer-row" key={`${t.fromId}-${t.toId}-${i}`}>
            <Avatar name={t.from} avatar={travelers.find((traveler) => traveler.name === t.from)?.avatar} size={24} /><span>{t.from}</span>
            <Icon name="arrow" />
            <Avatar name={t.to} avatar={travelers.find((traveler) => traveler.name === t.to)?.avatar} size={24} /><span>{t.to}</span>
            <span className="transfer-amt">{money(t.amt)}</span>
            <button className="mark-paid-button" onClick={() => markTransferPaid(t)} disabled={settlementSaving}>Mark paid</button>
          </div>
        ))}
        {settlements.length > 0 && <><div className="settle-divider">Payment history <span className="simplified-badge">{settlements.length}</span></div><div className="settlement-history">{settlements.map((settlement) => { const from = travelers.find((traveler) => traveler.id === settlement.from_traveler); const to = travelers.find((traveler) => traveler.id === settlement.to_traveler); return <div className="settlement-row" key={settlement.id}><span className="settlement-check">✓</span><div><strong>{from?.name || "Someone"} paid {to?.name || "someone"}</strong><small>{money(settlement.amount)} · {new Date(settlement.settled_at || settlement.created_at).toLocaleDateString()}</small></div><button onClick={() => undoSettlement(settlement.id)}>Undo</button></div>; })}</div></>}
      </div>
      </section>

      <section className={activeTab === "updates" ? "tab-panel" : "tab-panel is-hidden"}>
        <div className="updates-card">
          {updateFeed.length ? updateFeed.map((entry) => <div className="update-row" key={entry.id}><span className="feed-icon">{entry.icon}</span><div><strong>{entry.title}</strong><p>{entry.text}</p><small>{entry.date ? new Date(entry.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Just now"}</small></div></div>) : <div className="app-empty"><span>✦</span><h3>No updates yet</h3><p>New activities, votes, comments, and expenses will appear here.</p></div>}
        </div>
      </section>

      <section className={activeTab === "profile" ? "tab-panel" : "tab-panel is-hidden"}>
        <div className="trip-personal-profile">
          <div className="profile-hero-card">
            <Avatar name={profileDraft.name || me} avatar={myTraveler()?.avatar} size={76} />
            <div><h2>{profileDraft.name || me}</h2><p>{profileDraft.home || "Add your home city"}</p></div>
            <span className="profile-device-badge">Private account</span>
          </div>
          <AccountPanel account={account} displayName={profileDraft.name || me} />
          <div className="profile-card trip-profile-card profile-editor-card">
            <div className="profile-section-heading"><h3>Customise your profile</h3><p>This is about you. Trip dates, currency, and travelers now live in Trip details.</p></div>
            <label className="field-label">Photo or avatar</label>
            <div className="avatar-picker">{AVATAR_OPTIONS.map((avatar) => <button type="button" key={avatar} aria-label={`Use ${avatar} avatar`} className={myTraveler()?.avatar === avatar ? "selected" : ""} onClick={() => updateMyAvatar(avatar)}>{avatar}</button>)}</div>
            <label className="photo-upload-button">Upload your photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseMyPhoto(event.target.files?.[0])} /></label>
            <div className="profile-fields">
              <label><span className="field-label">Display name</span><input value={profileDraft.name} placeholder="Your name" onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label><span className="field-label">Home city</span><input value={profileDraft.home} placeholder="e.g. Dubai" onChange={(event) => setProfileDraft((current) => ({ ...current, home: event.target.value }))} /></label>
              <label className="profile-field-wide"><span className="field-label">About you</span><textarea rows="3" maxLength="140" value={profileDraft.bio} placeholder="Travel style, favourite food, or anything friends should know" onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} /></label>
              <label className="profile-field-wide"><span className="field-label">Preferred app currency</span><select value={profileDraft.currency} onChange={(event) => setProfileDraft((current) => ({ ...current, currency: event.target.value }))}>{Object.entries(CURRENCIES).map(([code, item]) => <option key={code} value={code}>{code} · {item.symbol.trim()}</option>)}</select></label>
            </div>
            <button type="button" className="save-profile-button" onClick={savePersonalProfile}>Save personal profile</button>
            <p className="profile-privacy-note">Saved privately to your Wayfare account and synced across your devices.</p>
          </div>
        </div>
      </section>

      <div className="footnote">Wayfare — private plans for authenticated group members.</div>

      {actionNotice && <div className={`action-notice ${actionNotice.type === "error" ? "notice-error" : ""}`} role="status">{actionNotice.text}</div>}
      {deleteTarget && <div className="confirm-backdrop" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}>
        <div className="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(event) => event.stopPropagation()}>
          <div className="confirm-icon">×</div>
          <h3 id="delete-title">Delete “{deleteTarget.name}”?</h3>
          <p>This removes the activity, its votes, and its comments from the {tripDisplayName} plan.</p>
          <div className="confirm-actions"><button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button><button className="danger-button" onClick={deleteActivity} disabled={deleting}>{deleting ? "Deleting…" : "Delete activity"}</button></div>
        </div>
      </div>}
      {shareOpen && <div className="confirm-backdrop" role="presentation" onClick={() => setShareOpen(false)}>
        <div className="confirm-sheet invite-sheet" role="dialog" aria-modal="true" aria-labelledby="invite-title" onClick={(event) => event.stopPropagation()}>
          <div className="invite-sheet-head"><div><span className="eyebrow">Plan together</span><h3 id="invite-title">Invite friends</h3></div><button type="button" aria-label="Close invite panel" onClick={() => setShareOpen(false)}>×</button></div>
          <p>{canManageMembers ? `Friends must sign in with their own account before they can join ${tripDisplayName}. This link expires after 30 days.` : `Only the owner can create an invite. These are the authenticated members of ${tripDisplayName}.`}</p>
          {canManageMembers && <><div className="invite-link-row"><input aria-label="Invite link" readOnly value={inviteLoading ? "Creating secure invite…" : inviteUrl} placeholder="Creating secure invite…" /><button type="button" onClick={copyInviteLink} disabled={inviteLoading || !inviteUrl}>Copy</button></div><button type="button" className="share-primary-button" onClick={shareInviteLink} disabled={inviteLoading || !inviteUrl}>Share secure invite</button></>}
          <div className="member-manager">
            <div className="member-manager-head"><strong>{expenseOnly ? "Group members" : "Travelers"}</strong><small>{travelers.length} joined</small></div>
            {travelers.map((traveler) => <div className="member-manager-row" key={traveler.id}><span><Avatar name={traveler.name} avatar={traveler.avatar} size={30} /><b>{traveler.name}</b>{traveler.role === "owner" && <small>Owner</small>}</span>{canManageMembers && traveler.id !== currentTraveler?.id && traveler.role !== "owner" && <button type="button" onClick={() => setMemberToRemove(traveler)}>Remove</button>}</div>)}
            {canManageMembers && <div className="member-add-row"><input aria-label="Friend's name" value={memberName} onChange={(event) => setMemberName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && addMember()} placeholder="Add a friend by name" /><button type="button" onClick={addMember} disabled={memberSaving}>{memberSaving ? "Adding…" : "Add"}</button></div>}
            {!canManageMembers && <p className="member-manager-note">The owner manages the member list. You can still share the invite link.</p>}
          </div>
        </div>
      </div>}
      {memberToRemove && <div className="confirm-backdrop member-remove-backdrop" role="presentation" onClick={() => !removingMember && setMemberToRemove(null)}>
        <div className="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="remove-member-title" onClick={(event) => event.stopPropagation()}><div className="confirm-icon">×</div><h3 id="remove-member-title">Remove {memberToRemove.name}?</h3><p>They will no longer participate in new splits. Items they paid for must be reassigned first.</p><div className="confirm-actions"><button type="button" onClick={() => setMemberToRemove(null)}>Cancel</button><button type="button" className="danger-button" onClick={removeMember} disabled={removingMember}>{removingMember ? "Removing…" : "Remove member"}</button></div></div>
      </div>}

      {activeTab === "plan" && !expenseOnly && <button className="fab" title="Add activity" onClick={() => { setAddOpen(true); setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }}>
        <Icon name="plus" style={{ width: 19, height: 19 }} /><span>Add activity</span>
      </button>}
      <nav className={`mobile-bottom-nav trip-bottom-nav ${expenseOnly ? "expense-group-nav" : ""}`} aria-label="Trip navigation">
        {!expenseOnly && <button className={`bottom-nav-item ${activeTab === "plan" ? "active" : ""}`} onClick={() => switchTab("plan")}><NavIcon name="plans" /><small>Itinerary</small></button>}
        <button className={`bottom-nav-item ${activeTab === "settle" ? "active" : ""}`} onClick={() => switchTab("settle")}><NavIcon name="settle" /><small>Settle up</small></button>
        <button className={`bottom-nav-item ${activeTab === "updates" ? "active" : ""}`} onClick={() => switchTab("updates")}><NavIcon name="updates" /><small>Updates</small></button>
        <button className={`bottom-nav-item ${activeTab === "profile" ? "active" : ""}`} onClick={() => switchTab("profile")}><NavIcon name="profile" /><small>Profile</small></button>
      </nav>
      </div>
    </div>
  );
}
