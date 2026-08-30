"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

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
  return [...new Set([
    place.name,
    place.street,
    place.district,
    place.city || place.town || place.village,
    place.state,
    place.country,
  ].filter(Boolean))].join(", ");
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
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const search = tripName && !clean.toLowerCase().includes(tripName.toLowerCase()) ? `${clean}, ${tripName}` : clean;
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(search)}&limit=6&lang=en`, { signal: controller.signal });
        if (!response.ok) throw new Error("Place search failed");
        const payload = await response.json();
        setRemoteResults((payload.features || []).map(formatPlaceResult).filter(Boolean));
      } catch (error) {
        if (error.name !== "AbortError") setRemoteResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, tripName]);

  const fallbackResults = suggestedLocations(query, tripName);
  const results = [...new Set([...remoteResults, ...fallbackResults])].filter((place) => place.toLowerCase() !== query.trim().toLowerCase()).slice(0, 6);

  function changeValue(next) {
    setQuery(next);
    queryRef.current = next;
    onValueChange?.(next);
    setOpen(true);
  }

  function commitValue(next) {
    const clean = next.trim();
    setQuery(clean);
    queryRef.current = clean;
    onValueChange?.(clean);
    onCommit?.(clean);
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
            <button type="button" key={place} onMouseDown={(event) => event.preventDefault()} onClick={() => commitValue(place)}>
              {place}<small>Use this exact location · opens in Google Maps</small>
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
};

const EXPENSE_GROUP_PREFIX = "WAYFARE_GROUP::";

function isExpenseGroupName(name) {
  return String(name || "").startsWith(EXPENSE_GROUP_PREFIX);
}

function displayGroupName(name) {
  return String(name || "").replace(EXPENSE_GROUP_PREFIX, "");
}

const DESTINATION_COVERS = [
  { match: /cairo|giza/i, url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/The_Giza_Pyramids.jpg/1280px-The_Giza_Pyramids.jpg" },
  { match: /barcelona/i, url: "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1600&q=85" },
  { match: /paris/i, url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=85" },
  { match: /london/i, url: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1600&q=85" },
  { match: /tokyo/i, url: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1600&q=85" },
  { match: /dubai/i, url: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=85" },
  { match: /rome/i, url: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=85" },
];

function coverForTrip(name = "") {
  return DESTINATION_COVERS.find((item) => item.match.test(name))?.url ||
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=85";
}

function useDestinationPhotos(name) {
  const [photos, setPhotos] = useState([coverForTrip(name)]);

  useEffect(() => {
    if (!name) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      action: "query", format: "json", formatversion: "2", origin: "*",
      generator: "search", gsrsearch: `${name} landmarks tourism`, gsrnamespace: "0", gsrlimit: "10",
      prop: "pageimages", piprop: "thumbnail", pithumbsize: "1600", pilimit: "10",
    });
    fetch(`https://en.wikipedia.org/w/api.php?${params}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Image search failed")))
      .then((payload) => {
        const found = (payload.query?.pages || []).sort((a, b) => (a.index || 0) - (b.index || 0)).map((page) => page.thumbnail?.source).filter(Boolean);
        if (found.length) setPhotos([...new Set([coverForTrip(name), ...found])].slice(0, 6));
      })
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
  const searchParams = useSearchParams();
  const [trip, setTrip] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [votesByActivity, setVotesByActivity] = useState({});
  const [commentsByActivity, setCommentsByActivity] = useState({});
  const [extraCosts, setExtraCosts] = useState([]);
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [newActivity, setNewActivity] = useState({ day_label: "Day 1", day_date: "", name: "", location: "", time_text: "", cost_pp: "", booking_info: "" });
  const [activityError, setActivityError] = useState("");
  const [activitySaving, setActivitySaving] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [costForm, setCostForm] = useState({ desc: "", amt: "", paidBy: "" });
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get("view");
    return ["plan", "settle", "updates", "profile"].includes(requested) ? requested : "plan";
  });
  const [currency, setCurrency] = useState("EUR");
  const [justAddedId, setJustAddedId] = useState(null);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const itemRefs = useRef({});
  const addFormRef = useRef(null);
  const destinationPhotos = useDestinationPhotos(displayGroupName(trip?.name));

  useEffect(() => {
    if (isExpenseGroupName(trip?.name) && activeTab === "plan") setActiveTab("settle");
  }, [trip?.name, activeTab]);

  useEffect(() => {
    setHeroPhotoIndex(0);
    if (destinationPhotos.length < 2) return;
    const timer = setInterval(() => setHeroPhotoIndex((index) => (index + 1) % destinationPhotos.length), 6500);
    return () => clearInterval(timer);
  }, [destinationPhotos]);

  const load = useCallback(async () => {
    const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).single();
    setTrip(tripData);
    if (tripData?.currency && CURRENCIES[tripData.currency]) setCurrency(tripData.currency);

    const { data: travelerData } = await supabase.from("travelers").select("*").eq("trip_id", tripId);
    setTravelers(travelerData || []);

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

    const { data: costData } = await supabase.from("extra_costs").select("*, travelers(name)").eq("trip_id", tripId);
    setExtraCosts(costData || []);
  }, [tripId]);

  useEffect(() => {
    load();
    const savedName = localStorage.getItem(`wayfare_name_${tripId}`);
    if (savedName) setMe(savedName);
    const savedCurrency = localStorage.getItem(`wayfare_currency_${tripId}`);
    if (savedCurrency && CURRENCIES[savedCurrency]) setCurrency(savedCurrency);

    const channel = supabase
      .channel(`trip-${tripId}`)
      .on("postgres_changes", { event: "*", schema: "public" }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [tripId, load]);

  useEffect(() => {
    if (justAddedId && itemRefs.current[justAddedId]) {
      itemRefs.current[justAddedId].scrollIntoView({ behavior: "smooth", block: "center" });
      const t = setTimeout(() => setJustAddedId(null), 2200);
      return () => clearTimeout(t);
    }
  }, [justAddedId, activities]);

  async function joinAsTraveler(chosenName) {
    const finalName = (chosenName ?? nameInput).trim();
    if (!finalName) return;
    const existing = travelers.find((t) => t.name.toLowerCase() === finalName.toLowerCase());
    if (!existing) {
      const savedAvatar = localStorage.getItem("wayfare_profile_avatar") || null;
      await supabase.from("travelers").insert({ trip_id: tripId, name: finalName, avatar: savedAvatar });
    }
    localStorage.setItem(`wayfare_name_${tripId}`, finalName);
    setMe(finalName);
    load();
  }

  function myTraveler() {
    return travelers.find((t) => t.name.toLowerCase() === (me || "").toLowerCase());
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
    else showNotice("Avatar updated.");
  }

  async function chooseMyPhoto(file) {
    if (!file) return;
    try {
      await updateMyAvatar(await compressProfilePhoto(file));
    } catch {
      showNotice("That photo couldn't be used. Try a JPG or PNG.", "error");
    }
  }

  async function updateTripDuration(value) {
    const duration_days = Math.max(1, Math.min(30, Number(value) || 1));
    setTrip((current) => ({ ...current, duration_days }));
    const { error } = await supabase.from("trips").update({ duration_days }).eq("id", tripId);
    if (error) showNotice(`Trip length wasn't saved: ${error.message}`, "error");
    else showNotice(`Trip updated to ${duration_days} day${duration_days === 1 ? "" : "s"}.`);
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
    setNewActivity({ ...newActivity, name: "", location: "", time_text: "", cost_pp: "", booking_info: "" });
    setAddOpen(false);
    showNotice(`${activityName} was added to ${tripDisplayName || "the plan"}.`);
    await load();
  }

  async function addExtraCost() {
    const val = parseFloat((costForm.amt || "").replace(/[^0-9.]/g, ""));
    if (!costForm.desc.trim() || !(val > 0) || !costForm.paidBy) {
      showNotice("Add a description, amount, and who paid.", "error");
      return;
    }
    const { error } = await supabase.from("extra_costs").insert({
      trip_id: tripId, description: costForm.desc.trim(), amount: val, paid_by: costForm.paidBy
    });
    if (error) {
      showNotice(`Expense wasn't added: ${error.message}`, "error");
      return;
    }
    setCostForm({ desc: "", amt: "", paidBy: "" });
    showNotice("Expense added.");
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

  const itemsTotal = activities.reduce((sum, a) => sum + (a.cost_pp || 0) * travelers.length, 0);
  const extrasTotal = extraCosts.reduce((sum, c) => sum + Number(c.amount), 0);
  const total = itemsTotal + extrasTotal;
  const share = travelers.length ? total / travelers.length : 0;
  const paidItemsTotal = activities.reduce((sum, a) => sum + (a.cost_pp > 0 && a.paid_by ? a.cost_pp * travelers.length : 0), 0);
  const paidExtrasTotal = extraCosts.reduce((sum, c) => sum + (c.paid_by ? Number(c.amount) : 0), 0);
  const settlementShare = travelers.length ? (paidItemsTotal + paidExtrasTotal) / travelers.length : 0;

  const paid = {};
  travelers.forEach((t) => (paid[t.id] = 0));
  activities.forEach((a) => {
    if (a.cost_pp > 0 && a.paid_by) paid[a.paid_by] = (paid[a.paid_by] || 0) + a.cost_pp * travelers.length;
  });
  extraCosts.forEach((c) => {
    if (c.paid_by) paid[c.paid_by] = (paid[c.paid_by] || 0) + Number(c.amount);
  });
  const balances = travelers.map((t) => ({ id: t.id, name: t.name, net: Math.round(((paid[t.id] || 0) - settlementShare) * 100) / 100 }));
  const debtors = balances.filter((b) => b.net < -0.5).map((b) => ({ ...b, amt: -b.net })).sort((a, b) => b.amt - a.amt);
  const creditors = balances.filter((b) => b.net > 0.5).map((b) => ({ ...b, amt: b.net })).sort((a, b) => b.amt - a.amt);
  const transfers = [];
  {
    let di = 0, ci = 0;
    const dcopy = debtors.map((d) => ({ ...d }));
    const ccopy = creditors.map((c) => ({ ...c }));
    while (di < dcopy.length && ci < ccopy.length) {
      const amt = Math.min(dcopy[di].amt, ccopy[ci].amt);
      transfers.push({ from: dcopy[di].name, to: ccopy[ci].name, amt: Math.round(amt) });
      dcopy[di].amt -= amt; ccopy[ci].amt -= amt;
      if (dcopy[di].amt < 0.5) di++;
      if (ccopy[ci].amt < 0.5) ci++;
    }
  }

  const expenseOnly = isExpenseGroupName(trip?.name);
  const tripDisplayName = displayGroupName(trip?.name);
  const tripDays = Math.max(1, Number(trip?.duration_days) || 3);
  const dayOptions = Array.from({ length: tripDays }, (_, index) => `Day ${index + 1}`);
  const myBalance = balances.find((b) => b.id === myTraveler()?.id);
  const money = (value, decimals = 0) => `${CURRENCIES[currency].symbol}${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
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
    extraCosts.forEach((cost) => feed.push({ id: `cost-${cost.id}`, date: cost.created_at, icon: "⇄", title: cost.description, text: `${cost.travelers?.name || "Someone"} added ${money(cost.amount)}` }));
    return feed.sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))).slice(0, 30);
  }, [activities, votesByActivity, commentsByActivity, extraCosts, travelers, currency]);

  if (!trip) return <div className="wrap"><div className="loading-state">Loading your trip…</div></div>;

  if (!me) {
    return (
      <div className="wrap name-gate">
        <div className="eyebrow">{tripDisplayName}</div>
        <h1 style={{ fontSize: 26, marginTop: 10 }}>What's your name?</h1>
        <p style={{ opacity: 0.6, fontSize: 13, marginTop: 6 }}>So the group knows whose votes are whose.</p>
        <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your name" onKeyDown={(e) => e.key === "Enter" && joinAsTraveler()} autoFocus />
        <button onClick={() => joinAsTraveler()}>{expenseOnly ? "Join expense group" : "Join trip"}</button>
        {travelers.length > 0 && (
          <div className="existing-travelers">
            <div className="field-label" style={{ textAlign: "center" }}>Already on this trip</div>
            <div className="traveler-chips">
              {travelers.map((t) => (
                <button key={t.id} className="traveler-chip" onClick={() => joinAsTraveler(t.name)}>
                  <Avatar name={t.name} avatar={t.avatar} size={20} /> {t.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const usedNames = new Set(activities.map((a) => a.name.toLowerCase()));
  const suggestionsToShow = SUGGESTIONS.filter((s) => !usedNames.has(s.name.toLowerCase())).slice(0, 6);

  return (
    <div className="trip-shell">
      <div className="trip-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(9,22,25,.08), rgba(9,22,25,.86)), url(${destinationPhotos[heroPhotoIndex] || coverForTrip(tripDisplayName)})` }}>
        <div className="hero-nav"><a className="all-plans-back hero-back" href={expenseOnly ? "/?view=settle" : "/"}>← {expenseOnly ? "All groups" : "All plans"}</a><button className="share-btn" onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied — send it to the group."); }}><Icon name="arrow" style={{ width: 14, height: 14 }} />Invite friends</button></div>
        <div className="hero-content">
          <div className="eyebrow hero-eyebrow">{expenseOnly ? "Shared expense group" : "Trip plan"}</div>
          <h1>{tripDisplayName}</h1>
          <div className="hero-meta">
            <span className="traveler-stack">{travelers.slice(0, 5).map((t) => <Avatar key={t.id} name={t.name} avatar={t.avatar} size={28} />)}</span>
            <span>{travelers.length} {expenseOnly ? `member${travelers.length === 1 ? "" : "s"}` : `traveler${travelers.length === 1 ? "" : "s"}`}</span><span>•</span><span>{expenseOnly ? `${extraCosts.length} expense${extraCosts.length === 1 ? "" : "s"}` : `${activities.length} ideas`}</span><span>•</span><span>{expenseOnly ? `${money(total)} shared` : `${money(share)} each so far`}</span>
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

      {activeTab === "plan" && !expenseOnly && <div className="trip-day-planner"><div className="trip-day-planner-head"><div><span className="eyebrow">{tripDays}-day trip</span><strong>Choose a day to add an activity</strong></div><small>Day choices are shared with everyone</small></div><div className="trip-day-buttons">{dayOptions.map((day) => { const count = activities.filter((activity) => (activity.day_label || "Day 1") === day).length; return <button key={day} onClick={() => { setNewActivity((current) => ({ ...current, day_label: day })); setAddOpen(true); setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }}><strong>{day}</strong><small>{count} activit{count === 1 ? "y" : "ies"}</small></button>; })}</div></div>}

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
          <button className="share-btn" onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied — send it to the group."); }}>
            <Icon name="pin" style={{ width: 14, height: 14 }} />Share
          </button>
        </div>
        <div className="stub">
          <div><div className="lab">Agreed</div><div className="val val-agreed">{counts.agreed}</div></div>
          <div><div className="lab">Contested</div><div className="val val-contested">{counts.contested}</div></div>
          <div><div className="lab">Waiting</div><div className="val val-waiting">{counts.waiting}</div></div>
        </div>
      </div>

      {activities.length === 0 && (
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

      {grouped.map(([dayLabel, group]) => {
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
                    <div className="inline-field inline-location-field"><Icon name="pin" /><PlacePicker compact value={editableLocation} tripName={tripDisplayName} onCommit={(location) => updateActivity(a.id, { location: location || null })} /></div>
                    <label className="inline-field inline-cost-field"><Icon name="coin" /><span className="currency-prefix">{CURRENCIES[currency].symbol}</span><input key={`cost-${a.id}-${a.cost_pp || 0}`} aria-label="Cost per person" type="number" min="0" step="0.01" inputMode="decimal" defaultValue={a.cost_pp || ""} placeholder="0" onFocus={(event) => event.currentTarget.select()} onBlur={(event) => { const value = parseFloat(event.target.value); updateActivity(a.id, { cost_pp: value > 0 ? value : 0 }); }} /><small>pp</small></label>
                    <label className="inline-field inline-time-field"><Icon name="clock" /><select aria-label="Activity time" value={editableTime} onChange={(event) => updateActivity(a.id, { time_text: event.target.value || null })}><option value="">Add time</option>{editableTime && !TIME_OPTIONS.includes(editableTime) && <option value={editableTime}>{editableTime}</option>}{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
                    {a.cost_pp > 0 && (
                      <select className="paid-select" value={a.paid_by || ""} onChange={(e) => updateActivity(a.id, { paid_by: e.target.value || null })}>
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
                    <button className="cal-btn" onClick={() => downloadIcs(a)}><Icon name="cal" />Add to calendar</button>
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

      {activities.length > 0 && suggestionsToShow.length > 0 && (
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
          <div><label className="field-label">Date</label><input type="date" value={newActivity.day_date} onChange={(e) => setNewActivity({ ...newActivity, day_date: e.target.value })} /></div>
          <div><label className="field-label">Time</label><select className="time-select" value={newActivity.time_text} onChange={(e) => setNewActivity({ ...newActivity, time_text: e.target.value })}><option value="">Select a time</option>{TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}</select></div>
          <div><label className="field-label">Cost per person</label><div className="composer-money-input"><span>{CURRENCIES[currency].symbol}</span><input aria-label="New activity cost per person" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0" value={newActivity.cost_pp} onFocus={(event) => event.currentTarget.select()} onChange={(e) => setNewActivity({ ...newActivity, cost_pp: e.target.value })} /></div></div>
        </div>
        <label className="field-label">Location <span>optional</span></label>
        <div className="location-field-row">
          <PlacePicker value={newActivity.location} tripName={tripDisplayName} onValueChange={(location) => setNewActivity((current) => ({ ...current, location }))} />
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
        {extraCosts.map((c) => (
          <div className="ledger-row" key={c.id}>
            <span className="ledger-name">
              {c.description} <span className="ledger-sub">{c.travelers?.name ? `— paid by ${c.travelers.name}` : ""}</span>
            </span>
            <span className="ledger-row-right">
              <span className="ledger-amt">{money(c.amount)}</span>
              <button className="icon-btn" title="Remove cost" onClick={() => deleteExtraCost(c.id)}><Icon name="trash" style={{ width: 12, height: 12 }} /></button>
            </span>
          </div>
        ))}
        {activities.filter((a) => a.cost_pp > 0).length === 0 && extraCosts.length === 0 && (
          <div className="ledger-empty">{expenseOnly ? "No expenses yet — add the first shared purchase below." : "No costs logged yet — add one below, or set a cost on an activity above."}</div>
        )}
        <div className="add-cost">
          <div className="add-cost-title"><strong>Add an expense</strong><small>Everyone gets an equal share</small></div>
          <input aria-label="Expense description" placeholder="e.g. Supermarket" value={costForm.desc} onChange={(e) => setCostForm({ ...costForm, desc: e.target.value })} />
          <div className="expense-amount-input"><span>{CURRENCIES[currency].symbol}</span><input aria-label="Expense amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0" value={costForm.amt} onFocus={(event) => event.currentTarget.select()} onChange={(e) => setCostForm({ ...costForm, amt: e.target.value })} /></div>
          <select className="paid-select" style={{ borderRadius: 8, padding: "0 8px" }} value={costForm.paidBy} onChange={(e) => setCostForm({ ...costForm, paidBy: e.target.value })}>
            <option value="">who paid?</option>
            {travelers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={addExtraCost}>Add</button>
        </div>
      </div>
      </section>

      <section className={activeTab === "settle" ? "tab-panel" : "tab-panel is-hidden"}>
      <div className="sec-head"><h2>Settle up</h2></div>
      <div className="settle-card">
        {myBalance && (
          <div className={`settle-headline ${myBalance.net > 0.5 ? "sh-pos" : myBalance.net < -0.5 ? "sh-neg" : "sh-zero"}`}>
            {myBalance.net > 0.5 && <>You're owed <b>{money(myBalance.net)}</b> overall</>}
            {myBalance.net < -0.5 && <>You owe <b>{money(Math.abs(myBalance.net))}</b> overall</>}
            {myBalance.net >= -0.5 && myBalance.net <= 0.5 && <>You're all settled up</>}
          </div>
        )}
        {balances.map((b) => (
          <div className="balance-row" key={b.id}>
            <span className="ledger-name balance-name"><Avatar name={b.name} avatar={travelers.find((traveler) => traveler.id === b.id)?.avatar} size={22} />{b.name}</span>
            <span className={b.net > 0.5 ? "balance-pos" : b.net < -0.5 ? "balance-neg" : "balance-zero"}>
              {b.net > 0.5 ? `gets back ${money(b.net)}` : b.net < -0.5 ? `owes ${money(Math.abs(b.net))}` : "settled"}
            </span>
          </div>
        ))}
        <div className="settle-divider">Who pays whom <span className="simplified-badge">simplified</span></div>
        {transfers.length === 0 ? (
          <div className="ledger-empty">Everyone's square.</div>
        ) : transfers.map((t, i) => (
          <div className="transfer-row" key={i}>
            <Avatar name={t.from} avatar={travelers.find((traveler) => traveler.name === t.from)?.avatar} size={24} /><span>{t.from}</span>
            <Icon name="arrow" />
            <Avatar name={t.to} avatar={travelers.find((traveler) => traveler.name === t.to)?.avatar} size={24} /><span>{t.to}</span>
            <span className="transfer-amt">{money(t.amt)}</span>
          </div>
        ))}
      </div>
      </section>

      <section className={activeTab === "updates" ? "tab-panel" : "tab-panel is-hidden"}>
        <div className="updates-card">
          {updateFeed.length ? updateFeed.map((entry) => <div className="update-row" key={entry.id}><span className="feed-icon">{entry.icon}</span><div><strong>{entry.title}</strong><p>{entry.text}</p><small>{entry.date ? new Date(entry.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Just now"}</small></div></div>) : <div className="app-empty"><span>✦</span><h3>No updates yet</h3><p>New activities, votes, comments, and expenses will appear here.</p></div>}
        </div>
      </section>

      <section className={activeTab === "profile" ? "tab-panel" : "tab-panel is-hidden"}>
        <div className="profile-card trip-profile-card">
          <Avatar name={me} avatar={myTraveler()?.avatar} size={72} />
          <h3>{me}</h3><p>You are viewing the {tripDisplayName} {expenseOnly ? "expense group" : "group plan"}.</p>
          <label className="field-label">Your avatar</label>
          <div className="avatar-picker">{AVATAR_OPTIONS.map((avatar) => <button type="button" key={avatar} className={myTraveler()?.avatar === avatar ? "selected" : ""} onClick={() => updateMyAvatar(avatar)}>{avatar}</button>)}</div>
          <label className="photo-upload-button">Add your photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseMyPhoto(event.target.files?.[0])} /></label>
          <label className="field-label">{expenseOnly ? "Group" : "Trip"} currency</label>
          <select className="settings-select" value={currency} onChange={(e) => { const next = e.target.value; setCurrency(next); localStorage.setItem(`wayfare_currency_${tripId}`, next); supabase.from("trips").update({ currency: next }).eq("id", tripId).then(() => {}); }}>{Object.entries(CURRENCIES).map(([code, item]) => <option key={code} value={code}>{code} · {item.symbol.trim()}</option>)}</select>
          {!expenseOnly && <><label className="field-label">Trip duration</label><div className="profile-duration-control"><input key={tripDays} aria-label="Trip duration in days" type="number" min="1" max="30" defaultValue={tripDays} onBlur={(event) => updateTripDuration(event.target.value)} /><span>days · creates Day 1 to Day {tripDays}</span></div></>}
          <div className="profile-members"><div className="field-label">{expenseOnly ? "Members" : "Travelers"}</div>{travelers.map((traveler) => <span key={traveler.id}><Avatar name={traveler.name} avatar={traveler.avatar} size={24} />{traveler.name}</span>)}</div>
          <a className="all-plans-link" href={expenseOnly ? "/?view=settle" : "/"}>Back to {expenseOnly ? "Settle up" : "all plans"}</a>
        </div>
      </section>

      <div className="footnote">Wayfare — everyone with this link sees live updates. No accounts, just names.</div>

      {actionNotice && <div className={`action-notice ${actionNotice.type === "error" ? "notice-error" : ""}`} role="status">{actionNotice.text}</div>}
      {deleteTarget && <div className="confirm-backdrop" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}>
        <div className="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(event) => event.stopPropagation()}>
          <div className="confirm-icon">×</div>
          <h3 id="delete-title">Delete “{deleteTarget.name}”?</h3>
          <p>This removes the activity, its votes, and its comments from the {tripDisplayName} plan.</p>
          <div className="confirm-actions"><button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button><button className="danger-button" onClick={deleteActivity} disabled={deleting}>{deleting ? "Deleting…" : "Delete activity"}</button></div>
        </div>
      </div>}

      {activeTab === "plan" && !expenseOnly && <button className="fab" title="Add activity" onClick={() => { setAddOpen(true); setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0); }}>
        <Icon name="plus" style={{ width: 19, height: 19 }} /><span>Add activity</span>
      </button>}
      <nav className={`mobile-bottom-nav trip-bottom-nav ${expenseOnly ? "expense-group-nav" : ""}`} aria-label="Trip navigation">
        {!expenseOnly && <button className={`bottom-nav-item ${activeTab === "plan" ? "active" : ""}`} onClick={() => setActiveTab("plan")}><span>☷</span><small>Itinerary</small></button>}
        <button className={`bottom-nav-item ${activeTab === "settle" ? "active" : ""}`} onClick={() => setActiveTab("settle")}><span>⇄</span><small>Settle up</small></button>
        <button className={`bottom-nav-item ${activeTab === "updates" ? "active" : ""}`} onClick={() => setActiveTab("updates")}><span>✦</span><small>Updates</small></button>
        <button className={`bottom-nav-item ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}><span>○</span><small>Profile</small></button>
      </nav>
      </div>
    </div>
  );
}
