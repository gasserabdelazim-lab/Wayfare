"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { CURRENCIES, currencySymbol, mapsUrl, searchPlaces, rememberTrip } from "../../../lib/wayfare";

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
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>',
  compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  feed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  friends: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-3-3.87"/><path d="M14 3.13a4 4 0 0 1 0 7.75"/><path d="M4 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="10" cy="7" r="4"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/></svg>',
  handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 13l2.5 2.5a1.7 1.7 0 0 0 2.4 0 1.7 1.7 0 0 0 0-2.4L10.5 10.5"/><path d="M11 13.5l1.5 1.5a1.7 1.7 0 0 0 2.4 0 1.7 1.7 0 0 0 0-2.4L12.5 10"/><path d="m2 11 4.5-4.5a2 2 0 0 1 2.83 0L11 8.17"/><path d="m22 11-4.5-4.5a2 2 0 0 0-2.83 0L13 8.17"/><path d="M2 11v5a1 1 0 0 0 1 1h1"/><path d="M22 11v5a1 1 0 0 1-1 1h-3"/></svg>',
};

function Icon({ name, style }) {
  return <span style={style} dangerouslySetInnerHTML={{ __html: icons[name] }} />;
}

const AVATAR_COLORS = ["#5b5bf0", "#ef5757", "#f0a63b", "#17a2b8", "#a855c9", "#1fa971", "#e0578a"];
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
function Avatar({ name, size = 26 }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColor(name) }}
      title={name}
    >
      {initials(name)}
    </span>
  );
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

function fmtDay(dateStr, fallbackLabel) {
  if (!dateStr) return fallbackLabel;
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return fallbackLabel;
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const md = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${weekday} · ${md}`;
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Builds and downloads a .ics calendar file for an activity. Falls back to
// "today" when no date has been set yet, so the button always produces a
// usable file instead of silently doing nothing.
function downloadIcs(activity) {
  let h = 9, m = 0;
  const match = (activity.time_text || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    h = parseInt(match[1], 10);
    m = parseInt(match[2], 10);
    const ampm = (match[3] || "").toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
  }
  const base = activity.day_date ? new Date(activity.day_date + "T00:00:00") : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0);
  const end = new Date(start.getTime() + 90 * 60000);
  const fmt = (d) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${String(
      d.getHours()
    ).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;
  const esc = (s) => (s || "").replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wayfare//Trip//EN",
    "BEGIN:VEVENT",
    "UID:" + activity.id + "@wayfare",
    "DTSTAMP:" + fmt(new Date()),
    "DTSTART:" + fmt(start),
    "DTEND:" + fmt(end),
    "SUMMARY:" + esc(activity.name),
    "LOCATION:" + esc(activity.location || ""),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (activity.name || "activity").replace(/[^a-z0-9]/gi, "_") + ".ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Small inline-editable field: shows a pill with the current value (or a
// muted placeholder), and turns into a real text input — pre-filled with
// the current value — when clicked, so editing never requires erasing
// placeholder text first.
function EditableField({ icon, value, placeholder, onSave, type = "text", renderValue, linkHref }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setDraft(value || "");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft !== (value || "")) onSave(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="meta-edit-input"
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  if (value && linkHref) {
    return (
      <span className="item-meta-field">
        <a className="meta-link" href={linkHref} target="_blank" rel="noopener noreferrer">
          <Icon name={icon} />
          {renderValue ? renderValue(value) : value}
        </a>
        <button className="icon-btn" title="Edit" onClick={() => setEditing(true)} style={{ opacity: 0.5 }}>
          <Icon name="edit" style={{ width: 11, height: 11 }} />
        </button>
      </span>
    );
  }

  return (
    <button className={`meta-btn${value ? " has-value" : ""}`} onClick={() => setEditing(true)}>
      <Icon name={icon} />
      {value ? (renderValue ? renderValue(value) : value) : placeholder}
    </button>
  );
}

// Location field: same inline-edit pattern as EditableField, but while
// typing it shows a live dropdown of matching real-world places (via
// OpenStreetMap) to pick from, and remembers the picked place's exact
// coordinates so the Maps link goes straight to that spot instead of a
// generic text search.
function LocationField({ value, lat, lng, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const pickedRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setDraft(value || "");
      pickedRef.current = null;
      setResults([]);
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function handleChange(v) {
    setDraft(v);
    pickedRef.current = null;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingResults(true);
      const places = await searchPlaces(v);
      setLoadingResults(false);
      setResults(places);
      setOpen(true);
    }, 400);
  }

  function pick(place) {
    pickedRef.current = place;
    setDraft(place.label);
    setOpen(false);
    setEditing(false);
    onSave(place.label, place.lat, place.lng);
  }

  function commit() {
    setOpen(false);
    setEditing(false);
    if (pickedRef.current) return; // already saved by pick()
    if (draft !== (value || "")) onSave(draft, null, null);
  }

  const linkHref = value ? mapsUrl(value, lat, lng) : null;

  if (editing) {
    return (
      <span className="item-meta-field location-field-editing">
        <input
          ref={inputRef}
          className="meta-edit-input"
          type="text"
          value={draft}
          placeholder="Search for a place…"
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(commit, 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        {open && (loadingResults || results.length > 0) && (
          <div className="location-dropdown">
            {loadingResults && <div className="location-dropdown-item location-dropdown-loading">Searching…</div>}
            {!loadingResults &&
              results.map((r, i) => (
                // onMouseDown (not onClick) so this fires before the input's onBlur closes the list.
                <div className="location-dropdown-item" key={i} onMouseDown={() => pick(r)}>
                  <Icon name="pin" style={{ width: 13, height: 13 }} />
                  <span>{r.label}</span>
                </div>
              ))}
          </div>
        )}
      </span>
    );
  }

  if (value && linkHref) {
    return (
      <span className="item-meta-field">
        <a className="meta-link" href={linkHref} target="_blank" rel="noopener noreferrer">
          <Icon name="pin" />
          {value}
        </a>
        <button className="icon-btn" title="Edit" onClick={() => setEditing(true)} style={{ opacity: 0.5 }}>
          <Icon name="edit" style={{ width: 11, height: 11 }} />
        </button>
      </span>
    );
  }

  return (
    <button className="meta-btn" onClick={() => setEditing(true)}>
      <Icon name="pin" />
      Add location
    </button>
  );
}

export default function TripPage() {
  const { id: tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [travelers, setTravelers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [votesByActivity, setVotesByActivity] = useState({});
  const [commentsByActivity, setCommentsByActivity] = useState({});
  const [extraCosts, setExtraCosts] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [newActivity, setNewActivity] = useState({ day_label: "", day_date: "", name: "" });
  const [costForm, setCostForm] = useState({ desc: "", amt: "", paidBy: "" });
  const [justAddedId, setJustAddedId] = useState(null);
  const [tab, setTab] = useState("trip");
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const itemRefs = useRef({});
  const addFormRef = useRef(null);

  const load = useCallback(async () => {
    const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).single();
    setTrip(tripData);

    const { data: travelerData } = await supabase.from("travelers").select("*").eq("trip_id", tripId);
    setTravelers(travelerData || []);

    const { data: activityData } = await supabase
      .from("activities").select("*").eq("trip_id", tripId).order("sort_order");
    setActivities(activityData || []);

    const activityIds = (activityData || []).map((a) => a.id);
    if (activityIds.length) {
      const { data: voteData } = await supabase.from("votes").select("*, travelers(name)").in("activity_id", activityIds);
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

    const { data: settleData } = await supabase.from("settlements").select("*").eq("trip_id", tripId);
    setSettlements(settleData || []);
  }, [tripId]);

  useEffect(() => {
    load();
    rememberTrip(tripId);
    const savedName = localStorage.getItem(`wayfare_name_${tripId}`);
    if (savedName) setMe(savedName);

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
      await supabase.from("travelers").insert({ trip_id: tripId, name: finalName });
    }
    localStorage.setItem(`wayfare_name_${tripId}`, finalName);
    rememberTrip(tripId);
    setMe(finalName);
    load();
  }

  function myTraveler() {
    return travelers.find((t) => t.name.toLowerCase() === (me || "").toLowerCase());
  }

  async function castVote(activityId, value) {
    const traveler = myTraveler();
    if (!traveler) return;
    const existing = (votesByActivity[activityId] || []).find((v) => v.traveler_id === traveler.id);
    if (existing && existing.value === value) {
      await supabase.from("votes").delete().eq("id", existing.id);
    } else {
      // Upsert on the (activity_id, traveler_id) unique constraint so a stale local
      // vote cache (e.g. realtime hasn't caught up yet) can never cause a duplicate-key 409.
      const { error } = await supabase
        .from("votes")
        .upsert(
          { activity_id: activityId, traveler_id: traveler.id, value },
          { onConflict: "activity_id,traveler_id" }
        );
      if (error) {
        console.error("castVote failed", error);
      }
    }
    load();
  }

  async function addComment(activityId, text) {
    const traveler = myTraveler();
    if (!traveler || !text.trim()) return;
    await supabase.from("comments").insert({ activity_id: activityId, traveler_id: traveler.id, text: text.trim() });
    load();
  }

  async function updateActivity(id, fields) {
    await supabase.from("activities").update(fields).eq("id", id);
    load();
  }

  async function deleteActivity(id) {
    if (!confirm("Remove this activity for everyone?")) return;
    await supabase.from("activities").delete().eq("id", id);
    load();
  }

  async function deleteExtraCost(id) {
    if (!confirm("Remove this cost?")) return;
    await supabase.from("extra_costs").delete().eq("id", id);
    load();
  }

  async function addActivity(prefillName) {
    const label = newActivity.day_label.trim() || "Unscheduled";
    const activityName = (prefillName ?? newActivity.name).trim();
    if (!activityName) return;
    const { data } = await supabase
      .from("activities")
      .insert({
        trip_id: tripId,
        day_label: label,
        day_date: newActivity.day_date || null,
        name: activityName,
        sort_order: activities.length,
      })
      .select()
      .single();
    setNewActivity({ day_label: newActivity.day_label, day_date: newActivity.day_date, name: "" });
    if (data) setJustAddedId(data.id);
    setTab("trip");
    load();
  }

  async function addExtraCost() {
    const val = parseFloat((costForm.amt || "").replace(/[^0-9.]/g, ""));
    if (!costForm.desc.trim() || !(val > 0) || !costForm.paidBy) return;
    await supabase.from("extra_costs").insert({
      trip_id: tripId, description: costForm.desc.trim(), amount: val, paid_by: costForm.paidBy
    });
    setCostForm({ desc: "", amt: "", paidBy: "" });
    load();
  }

  async function updateCurrency(code) {
    setShowCurrencyMenu(false);
    await supabase.from("trips").update({ currency: code }).eq("id", tripId);
    load();
  }

  async function recordSettlement(fromId, toId, amount) {
    if (!confirm(`Mark ${Math.round(amount)} as paid?`)) return;
    await supabase.from("settlements").insert({ trip_id: tripId, from_traveler: fromId, to_traveler: toId, amount });
    load();
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
  const totalItems = activities.length || 1;

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

  const sym = currencySymbol(trip?.currency);

  const itemsTotal = activities.reduce((sum, a) => sum + (a.cost_pp || 0) * travelers.length, 0);
  const extrasTotal = extraCosts.reduce((sum, c) => sum + Number(c.amount), 0);
  const total = itemsTotal + extrasTotal;
  const share = travelers.length ? total / travelers.length : 0;

  const paid = {};
  travelers.forEach((t) => (paid[t.id] = 0));
  activities.forEach((a) => {
    if (a.cost_pp > 0 && a.paid_by) paid[a.paid_by] = (paid[a.paid_by] || 0) + a.cost_pp * travelers.length;
  });
  extraCosts.forEach((c) => {
    if (c.paid_by) paid[c.paid_by] = (paid[c.paid_by] || 0) + Number(c.amount);
  });

  // Settlements are real-world payments already made outside the app —
  // each one nudges the payer's balance up (they've paid off some of what
  // they owed) and the receiver's balance down (they've collected some of
  // what they were owed) without touching the underlying costs.
  const settleAdjust = {};
  travelers.forEach((t) => (settleAdjust[t.id] = 0));
  settlements.forEach((s) => {
    settleAdjust[s.from_traveler] = (settleAdjust[s.from_traveler] || 0) + Number(s.amount);
    settleAdjust[s.to_traveler] = (settleAdjust[s.to_traveler] || 0) - Number(s.amount);
  });

  const balances = travelers.map((t) => ({
    id: t.id,
    name: t.name,
    net: Math.round(((paid[t.id] || 0) - share + (settleAdjust[t.id] || 0)) * 100) / 100,
  }));
  const debtors = balances.filter((b) => b.net < -0.5).map((b) => ({ ...b, amt: -b.net })).sort((a, b) => b.amt - a.amt);
  const creditors = balances.filter((b) => b.net > 0.5).map((b) => ({ ...b, amt: b.net })).sort((a, b) => b.amt - a.amt);
  const transfers = [];
  {
    let di = 0, ci = 0;
    const dcopy = debtors.map((d) => ({ ...d }));
    const ccopy = creditors.map((c) => ({ ...c }));
    while (di < dcopy.length && ci < ccopy.length) {
      const amt = Math.min(dcopy[di].amt, ccopy[ci].amt);
      transfers.push({ fromId: dcopy[di].id, from: dcopy[di].name, toId: ccopy[ci].id, to: ccopy[ci].name, amt: Math.round(amt) });
      dcopy[di].amt -= amt; ccopy[ci].amt -= amt;
      if (dcopy[di].amt < 0.5) di++;
      if (ccopy[ci].amt < 0.5) ci++;
    }
  }

  const myBalance = balances.find((b) => b.id === myTraveler()?.id);

  // Activity feed: chronological list of votes / comments / additions, newest first.
  const feedEvents = useMemo(() => {
    const events = [];
    activities.forEach((a) => {
      events.push({ id: `add-${a.id}`, ts: a.created_at, kind: "add", activity: a });
      (votesByActivity[a.id] || []).forEach((v) => {
        events.push({ id: `vote-${v.id}`, ts: v.created_at, kind: "vote", activity: a, vote: v });
      });
      (commentsByActivity[a.id] || []).forEach((c) => {
        events.push({ id: `comment-${c.id}`, ts: c.created_at, kind: "comment", activity: a, comment: c });
      });
    });
    extraCosts.forEach((c) => {
      events.push({ id: `cost-${c.id}`, ts: c.created_at, kind: "cost", cost: c });
    });
    settlements.forEach((s) => {
      events.push({ id: `settle-${s.id}`, ts: s.created_at, kind: "settle", settle: s });
    });
    return events.sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 40);
  }, [activities, votesByActivity, commentsByActivity, extraCosts, settlements]);

  if (!trip) return <div className="wrap"><div className="loading-state">Loading your trip…</div></div>;

  if (!me) {
    return (
      <div className="wrap name-gate">
        <div className="eyebrow">{trip.name}</div>
        <h1 style={{ fontSize: 26, marginTop: 10 }}>What's your name?</h1>
        <p style={{ opacity: 0.6, fontSize: 13, marginTop: 6 }}>So the group knows whose votes are whose.</p>
        <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your name" onKeyDown={(e) => e.key === "Enter" && joinAsTraveler()} autoFocus />
        <button onClick={() => joinAsTraveler()}>Join trip</button>
        {travelers.length > 0 && (
          <div className="existing-travelers">
            <div className="field-label" style={{ textAlign: "center" }}>Already on this trip</div>
            <div className="traveler-chips">
              {travelers.map((t) => (
                <button key={t.id} className="traveler-chip" onClick={() => joinAsTraveler(t.name)}>
                  <Avatar name={t.name} size={20} /> {t.name}
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
    <div className="wrap">
      <div className="trip-header">
        <a className="back-to-trips" href="/"><Icon name="home" style={{ width: 13, height: 13 }} />My trips</a>
        <div className="trip-top">
          <div>
            <div className="eyebrow">Group trip</div>
            <h1>{trip.name}</h1>
            <div className="trip-header-meta">
              <span className="traveler-stack">
                {travelers.slice(0, 5).map((t) => <Avatar key={t.id} name={t.name} size={22} />)}
              </span>
              {travelers.length} traveler{travelers.length === 1 ? "" : "s"} · you're {me}
            </div>
          </div>
          <div className="trip-header-actions">
            <div className="currency-menu-wrap">
              <button className="icon-round-btn" title="Trip settings" onClick={() => setShowCurrencyMenu((v) => !v)}>
                <Icon name="settings" style={{ width: 16, height: 16 }} />
              </button>
              {showCurrencyMenu && (
                <div className="currency-menu">
                  <div className="currency-menu-label">Currency</div>
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      className={`currency-menu-item${c.code === trip.currency ? " active" : ""}`}
                      onClick={() => updateCurrency(c.code)}
                    >
                      <span className="currency-menu-symbol">{c.symbol}</span>
                      {c.label}
                      {c.code === trip.currency && <Icon name="check" style={{ width: 12, height: 12, marginLeft: "auto" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="share-btn" onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied — send it to the group."); }}>
              <Icon name="pin" style={{ width: 14, height: 14 }} />Share
            </button>
          </div>
        </div>
        <div className="stub">
          <div><div className="lab">Agreed</div><div className="val">{counts.agreed}</div></div>
          <div><div className="lab">Contested</div><div className="val">{counts.contested}</div></div>
          <div><div className="lab">Waiting</div><div className="val">{counts.waiting}</div></div>
        </div>
        <div className="progress-track">
          <span className="progress-seg progress-agreed" style={{ width: `${(counts.agreed / totalItems) * 100}%` }} />
          <span className="progress-seg progress-contested" style={{ width: `${(counts.contested / totalItems) * 100}%` }} />
        </div>
      </div>

      {tab === "trip" && (
        <>
          {activities.length === 0 && (
            <div className="empty-state">
              <Icon name="sparkle" style={{ width: 22, height: 22, opacity: 0.5 }} />
              <div className="empty-title">No activities yet</div>
              <div className="empty-sub">Add the first idea below, or try a quick suggestion.</div>
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
                          <button className="icon-btn" title="Remove activity" onClick={() => deleteActivity(a.id)}>
                            <Icon name="trash" style={{ width: 13, height: 13 }} />
                          </button>
                        </div>
                      </div>
                      <div className="item-meta">
                        <LocationField
                          value={a.location}
                          lat={a.location_lat}
                          lng={a.location_lng}
                          onSave={(v, lat, lng) => updateActivity(a.id, { location: v, location_lat: lat, location_lng: lng })}
                        />
                        <EditableField
                          icon="coin"
                          value={a.cost_pp ? String(a.cost_pp) : ""}
                          placeholder="Add cost"
                          onSave={(v) => {
                            const num = parseFloat((v || "").replace(/[^0-9.]/g, ""));
                            updateActivity(a.id, { cost_pp: num > 0 ? num : 0 });
                          }}
                          renderValue={(v) => `${sym}${v} pp`}
                        />
                        <EditableField
                          icon="clock"
                          value={a.time_text}
                          placeholder="Add time"
                          onSave={(v) => updateActivity(a.id, { time_text: v })}
                        />
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
                            return <span key={v.id} className={`voter-dot vd-${v.value}`}><Avatar name={t.name} size={18} /></span>;
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
                        <button className="cal-btn" onClick={() => downloadIcs(a)}><Icon name="cal" />Add to calendar</button>
                      </div>
                      <div className="booking">
                        <input placeholder="Booking link or confirmation #" defaultValue={a.booking_info || ""} onBlur={(e) => updateActivity(a.id, { booking_info: e.target.value })} />
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

          <div className="sec-head"><h2>Add an activity</h2></div>
          <div className="home-card" ref={addFormRef}>
            <label className="field-label">Day</label>
            <input placeholder="e.g. Day 3 · Barcelona" value={newActivity.day_label} onChange={(e) => setNewActivity({ ...newActivity, day_label: e.target.value })} />
            <label className="field-label">Date (optional, keeps days in order)</label>
            <input type="date" value={newActivity.day_date} onChange={(e) => setNewActivity({ ...newActivity, day_date: e.target.value })} />
            <label className="field-label">Activity</label>
            <input placeholder="e.g. Sagrada Família tour" value={newActivity.name} onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addActivity()} />
            <button onClick={() => addActivity()}><Icon name="plus" style={{ width: 13, height: 13, marginRight: 6 }} />Add activity</button>
          </div>

          <div className="footnote">Wayfare — everyone with this link sees live updates. No accounts, just names.</div>
        </>
      )}

      {tab === "activity" && (
        <>
          <div className="sec-head"><h2>Activity</h2></div>
          {feedEvents.length === 0 ? (
            <div className="feed-empty">Nothing has happened yet — add an activity to get things moving.</div>
          ) : (
            <div className="cost-card">
              {feedEvents.map((ev) => {
                if (ev.kind === "add") {
                  return (
                    <div className="feed-item" key={ev.id}>
                      <span className="feed-icon"><Icon name="plus" /></span>
                      <div>
                        <div className="feed-text"><b>{ev.activity.name}</b> was added to {ev.activity.day_label || "the trip"}</div>
                        <div className="feed-time">{timeAgo(ev.ts)}</div>
                      </div>
                    </div>
                  );
                }
                if (ev.kind === "vote") {
                  const t = travelers.find((tr) => tr.id === ev.vote.traveler_id);
                  const word = ev.vote.value === "up" ? "voted Good on" : ev.vote.value === "meh" ? "voted Meh on" : "skipped";
                  return (
                    <div className="feed-item" key={ev.id}>
                      <span className="feed-icon feed-vote"><Icon name={ev.vote.value === "up" ? "up" : ev.vote.value === "meh" ? "meh" : "down"} /></span>
                      <div>
                        <div className="feed-text"><b>{t?.name || "Someone"}</b> {word} <b>{ev.activity.name}</b></div>
                        <div className="feed-time">{timeAgo(ev.ts)}</div>
                      </div>
                    </div>
                  );
                }
                if (ev.kind === "comment") {
                  return (
                    <div className="feed-item" key={ev.id}>
                      <span className="feed-icon"><Icon name="feed" /></span>
                      <div>
                        <div className="feed-text"><b>{ev.comment.travelers?.name || "Someone"}</b> commented on <b>{ev.activity.name}</b>: "{ev.comment.text}"</div>
                        <div className="feed-time">{timeAgo(ev.ts)}</div>
                      </div>
                    </div>
                  );
                }
                if (ev.kind === "settle") {
                  const from = travelers.find((t) => t.id === ev.settle.from_traveler);
                  const to = travelers.find((t) => t.id === ev.settle.to_traveler);
                  return (
                    <div className="feed-item" key={ev.id}>
                      <span className="feed-icon feed-settle"><Icon name="handshake" /></span>
                      <div>
                        <div className="feed-text"><b>{from?.name || "Someone"}</b> paid <b>{to?.name || "someone"}</b> {sym}{Math.round(ev.settle.amount)}</div>
                        <div className="feed-time">{timeAgo(ev.ts)}</div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="feed-item" key={ev.id}>
                    <span className="feed-icon feed-cost"><Icon name="coin" /></span>
                    <div>
                      <div className="feed-text"><b>{ev.cost.travelers?.name || "Someone"}</b> added a cost: <b>{ev.cost.description}</b> ({sym}{Math.round(ev.cost.amount)})</div>
                      <div className="feed-time">{timeAgo(ev.ts)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "splitfare" && (
        <>
          <div className="sec-head"><h2>Splitfare</h2></div>
          <div className="cost-card">
            <div className="cost-total">
              <div><div className="num">{sym}{Math.round(total).toLocaleString()}</div><div className="lab">total, all items + extras</div></div>
              <div style={{ textAlign: "right" }}><div className="num">{sym}{Math.round(share).toLocaleString()}</div><div className="lab">per traveler</div></div>
            </div>
            <div className="cost-sub">{sym}{Math.round(itemsTotal).toLocaleString()} from activities · {sym}{Math.round(extrasTotal).toLocaleString()} in extras</div>
            {activities.filter((a) => a.cost_pp > 0).map((a) => {
              const payer = travelers.find((t) => t.id === a.paid_by);
              return (
                <div className="ledger-row" key={a.id}>
                  <span className="ledger-name">
                    {a.name} <span className="ledger-sub">— {sym}{a.cost_pp} pp{payer ? ` · paid by ${payer.name}` : ""}</span>
                  </span>
                  <span className="ledger-amt">{sym}{Math.round(a.cost_pp * travelers.length)}</span>
                </div>
              );
            })}
            {extraCosts.map((c) => (
              <div className="ledger-row" key={c.id}>
                <span className="ledger-name">
                  {c.description} <span className="ledger-sub">{c.travelers?.name ? `— paid by ${c.travelers.name}` : ""}</span>
                </span>
                <span className="ledger-row-right">
                  <span className="ledger-amt">{sym}{Math.round(c.amount)}</span>
                  <button className="icon-btn" title="Remove cost" onClick={() => deleteExtraCost(c.id)}><Icon name="trash" style={{ width: 12, height: 12 }} /></button>
                </span>
              </div>
            ))}
            {activities.filter((a) => a.cost_pp > 0).length === 0 && extraCosts.length === 0 && (
              <div className="ledger-empty">No costs logged yet — add one below, or set a cost on an activity in the Trip tab.</div>
            )}
            <div className="add-cost">
              <input placeholder="What was it for?" value={costForm.desc} onChange={(e) => setCostForm({ ...costForm, desc: e.target.value })} />
              <input placeholder={`${sym} amount`} value={costForm.amt} onChange={(e) => setCostForm({ ...costForm, amt: e.target.value })} />
              <select className="paid-select" style={{ borderRadius: 8, padding: "0 8px" }} value={costForm.paidBy} onChange={(e) => setCostForm({ ...costForm, paidBy: e.target.value })}>
                <option value="">who paid?</option>
                {travelers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={addExtraCost}>Add</button>
            </div>
          </div>

          <div className="sec-head"><h2>Settle up</h2></div>
          <div className="settle-card">
            {myBalance && (
              <div className={`settle-headline ${myBalance.net > 0.5 ? "sh-pos" : myBalance.net < -0.5 ? "sh-neg" : "sh-zero"}`}>
                {myBalance.net > 0.5 && <>You're owed <b>{sym}{myBalance.net.toFixed(0)}</b> overall</>}
                {myBalance.net < -0.5 && <>You owe <b>{sym}{Math.abs(myBalance.net).toFixed(0)}</b> overall</>}
                {myBalance.net >= -0.5 && myBalance.net <= 0.5 && <>You're all settled up</>}
              </div>
            )}
            {balances.map((b) => (
              <div className="balance-row" key={b.id}>
                <span className="ledger-name balance-name"><Avatar name={b.name} size={22} />{b.name}</span>
                <span className={b.net > 0.5 ? "balance-pos" : b.net < -0.5 ? "balance-neg" : "balance-zero"}>
                  {b.net > 0.5 ? `gets back ${sym}${b.net.toFixed(0)}` : b.net < -0.5 ? `owes ${sym}${Math.abs(b.net).toFixed(0)}` : "settled"}
                </span>
              </div>
            ))}
            <div className="settle-divider">Who pays whom <span className="simplified-badge">simplified</span></div>
            {transfers.length === 0 ? (
              <div className="ledger-empty">Everyone's square.</div>
            ) : transfers.map((t, i) => (
              <div className="transfer-row" key={i}>
                <Avatar name={t.from} size={24} /><span>{t.from}</span>
                <Icon name="arrow" />
                <Avatar name={t.to} size={24} /><span>{t.to}</span>
                <span className="transfer-amt">{sym}{t.amt}</span>
                <button className="settle-btn" onClick={() => recordSettlement(t.fromId, t.toId, t.amt)}>
                  <Icon name="check" style={{ width: 12, height: 12 }} />Settle
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "groups" && (
        <>
          <div className="sec-head"><h2>Group</h2></div>
          <div className="cost-card">
            {travelers.map((t) => (
              <div className="group-member-row" key={t.id}>
                <Avatar name={t.name} size={36} />
                <div>
                  <div className="group-member-name">
                    {t.name}
                    {t.name.toLowerCase() === (me || "").toLowerCase() && <span className="group-member-you">You</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="share-btn" style={{ marginTop: 16, background: "var(--primary)", color: "#fff", border: "none" }} onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied — send it to the group."); }}>
            <Icon name="pin" style={{ width: 14, height: 14 }} />Invite someone with the trip link
          </button>
        </>
      )}

      <button className="fab" title="Add activity" onClick={() => { setTab("trip"); setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); }}>
        <Icon name="plus" style={{ width: 22, height: 22 }} />
      </button>

      <nav className="tabbar">
        <div className="tabbar-inner">
          <button className={`tab-btn${tab === "trip" ? " active" : ""}`} onClick={() => setTab("trip")}>
            <Icon name="compass" />Trip
          </button>
          <button className={`tab-btn${tab === "activity" ? " active" : ""}`} onClick={() => setTab("activity")}>
            <Icon name="feed" />Activity
          </button>
          <button className={`tab-btn${tab === "splitfare" ? " active" : ""}`} onClick={() => setTab("splitfare")}>
            <Icon name="friends" />Splitfare
          </button>
          <button className={`tab-btn${tab === "groups" ? " active" : ""}`} onClick={() => setTab("groups")}>
            <Icon name="users" />Groups
          </button>
        </div>
      </nav>
    </div>
  );
}
