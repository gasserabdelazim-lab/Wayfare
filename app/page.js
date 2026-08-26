"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { CURRENCIES, currencySymbol, getLocalTrips, rememberTrip } from "../lib/wayfare";

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
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColor(name) }} title={name}>
      {initials(name)}
    </span>
  );
}

function fmtRange(start, end) {
  if (!start && !end) return null;
  const opts = { month: "short", day: "numeric" };
  const s = start ? new Date(start + "T00:00:00").toLocaleDateString(undefined, opts) : null;
  const e = end ? new Date(end + "T00:00:00").toLocaleDateString(undefined, opts) : null;
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [yourName, setYourName] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [trips, setTrips] = useState(null); // null = still loading
  const [tripMeta, setTripMeta] = useState({}); // id -> { travelers, total }

  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    const ids = getLocalTrips();
    if (!ids.length) {
      setTrips([]);
      return;
    }
    const { data } = await supabase.from("trips").select("*").in("id", ids);
    const byId = {};
    (data || []).forEach((t) => (byId[t.id] = t));
    // Preserve most-recent-first order from localStorage; drop any trip that
    // no longer exists (deleted, or a stale id from another environment).
    const ordered = ids.map((id) => byId[id]).filter(Boolean);
    setTrips(ordered);

    if (ordered.length) {
      const tripIds = ordered.map((t) => t.id);
      const [{ data: travelerRows }, { data: activityRows }, { data: extraRows }] = await Promise.all([
        supabase.from("travelers").select("*").in("trip_id", tripIds),
        supabase.from("activities").select("trip_id, cost_pp").in("trip_id", tripIds),
        supabase.from("extra_costs").select("trip_id, amount").in("trip_id", tripIds),
      ]);
      const meta = {};
      tripIds.forEach((id) => (meta[id] = { travelers: [], total: 0 }));
      (travelerRows || []).forEach((t) => meta[t.trip_id]?.travelers.push(t));
      (activityRows || []).forEach((a) => {
        if (meta[a.trip_id]) meta[a.trip_id].total += (a.cost_pp || 0) * (meta[a.trip_id].travelers.length || 1);
      });
      (extraRows || []).forEach((c) => {
        if (meta[c.trip_id]) meta[c.trip_id].total += Number(c.amount) || 0;
      });
      setTripMeta(meta);
    }
  }

  async function createTrip() {
    if (!name.trim() || !yourName.trim()) {
      setError("Add a trip name and your name first.");
      return;
    }
    setLoading(true);
    setError("");

    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .insert({ name: name.trim(), currency })
      .select()
      .single();

    if (tripErr) {
      setError("Couldn't create the trip. Try again.");
      setLoading(false);
      return;
    }

    const { error: travelerErr } = await supabase
      .from("travelers")
      .insert({ trip_id: trip.id, name: yourName.trim() });

    if (travelerErr) {
      setError("Trip created, but couldn't add you as a traveler.");
      setLoading(false);
      return;
    }

    localStorage.setItem(`wayfare_name_${trip.id}`, yourName.trim());
    rememberTrip(trip.id);
    router.push(`/trip/${trip.id}`);
  }

  const createForm = (
    <div className="home-card">
      <div className="eyebrow" style={{ marginBottom: 12 }}>Start a new trip</div>
      <label className="field-label">Trip name</label>
      <input
        placeholder="e.g. Bilbao & San Sebastián"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && createTrip()}
        autoFocus
      />
      <label className="field-label">Your name</label>
      <input
        placeholder="So the group knows it's you"
        value={yourName}
        onChange={(e) => setYourName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && createTrip()}
      />
      <label className="field-label">Currency</label>
      <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>{c.symbol} — {c.label}</option>
        ))}
      </select>
      {error && <p className="form-error">{error}</p>}
      <button onClick={createTrip} disabled={loading}>
        {loading ? "Creating…" : "Create trip"}
      </button>
    </div>
  );

  // First-time visitor with no trips yet: show the full hero + create form,
  // same warm welcome as before.
  if (trips !== null && trips.length === 0 && !showCreate) {
    return (
      <div className="wrap home-wrap">
        <div className="home-hero">
          <div className="eyebrow">Wayfare</div>
          <h1 style={{ fontSize: 34, marginTop: 10 }}>Plan the trip together</h1>
          <p style={{ color: "var(--ink)", opacity: 0.72, marginTop: 10, lineHeight: 1.6, fontSize: 15 }}>
            Propose the itinerary, everyone votes, costs split themselves out. No accounts, just a link.
          </p>
          <div className="home-features">
            <div className="home-feature"><span className="hf-dot up-dot" />Vote good / meh / skip on each stop</div>
            <div className="home-feature"><span className="hf-dot gold-dot" />Costs split and settled automatically</div>
            <div className="home-feature"><span className="hf-dot teal-dot" />Share one link — no sign-up for anyone</div>
          </div>
        </div>
        {createForm}
      </div>
    );
  }

  return (
    <div className="wrap home-wrap">
      <div className="trips-header">
        <div>
          <div className="eyebrow">Wayfare</div>
          <h1 style={{ fontSize: 28, marginTop: 8 }}>Your trips</h1>
        </div>
        <button className="new-trip-btn" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "+ New trip"}
        </button>
      </div>

      {showCreate && createForm}

      {trips === null && <div className="loading-state">Loading your trips…</div>}

      {trips !== null && trips.length > 0 && (
        <div className="trip-card-list">
          {trips.map((t) => {
            const meta = tripMeta[t.id] || { travelers: [], total: 0 };
            const range = fmtRange(t.start_date, t.end_date);
            return (
              <a className="trip-card" key={t.id} href={`/trip/${t.id}`}>
                <div className="trip-card-top">
                  <div className="trip-card-name">{t.name}</div>
                  {range && <div className="trip-card-range">{range}</div>}
                </div>
                <div className="trip-card-bottom">
                  <span className="traveler-stack">
                    {meta.travelers.slice(0, 5).map((tr) => <Avatar key={tr.id} name={tr.name} size={24} />)}
                  </span>
                  <span className="trip-card-total">
                    {meta.total > 0
                      ? `${currencySymbol(t.currency)}${Math.round(meta.total).toLocaleString()} total`
                      : `${meta.travelers.length} traveler${meta.travelers.length === 1 ? "" : "s"}`}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}

      <div className="footnote" style={{ marginTop: 28 }}>
        Have a trip link from someone else? Just open it — you'll join automatically and it'll show up here too.
      </div>
    </div>
  );
}
