"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { destinationInfo } from "../../lib/destinations";
import { ActionBar, EmptyNote, Field, IconToggle, PillTabs, PlusButton, SearchField, Setup, Sheet, formatDateTime } from "./ui";

const CATEGORIES = ["Food & drink", "Sights", "Activities", "Shopping", "Nightlife", "Other"];
const EXPLORE = [
  { id: "coffee", label: "Coffee" },
  { id: "restaurants", label: "Restaurants" },
  { id: "activities", label: "Activities" },
  { id: "kids", label: "For Kids" },
  { id: "sights", label: "Sights" },
];
const TILE_HUES = { coffee: "28 60% 38%", restaurants: "8 62% 44%", activities: "262 55% 52%", kids: "170 55% 38%", sights: "215 60% 48%" };

function PinIcon() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></svg>;
}

/* ---------------- Saved places ---------------- */
function SavedPlaces({ features, tripName, userId, canManage, onAddToSchedule, renderMap }) {
  const [mode, setMode] = useState("all");
  const [view, setView] = useState("list");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", category: "", collection: "", latitude: null, longitude: null });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const places = useMemo(() => {
    const q = query.trim().toLowerCase();
    return features.places.filter((p) => !q || [p.name, p.address, p.collection, p.category].join(" ").toLowerCase().includes(q));
  }, [features.places, query]);
  const collections = useMemo(() => [...new Set(features.places.map((p) => p.collection).filter(Boolean))], [features.places]);

  useEffect(() => {
    const q = search.trim();
    if (!open || q.length < 3) { setResults([]); return undefined; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const term = destinationInfo(tripName).term;
        const response = await fetch(`/api/places?q=${encodeURIComponent(`${q} ${term}`.trim())}`, { signal: controller.signal });
        const payload = await response.json();
        setResults(payload.results || []);
      } catch { setResults([]); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, open, tripName]);

  function openNew() { setForm({ name: "", address: "", category: "", collection: "", latitude: null, longitude: null }); setSearch(""); setResults([]); setOpen(true); }
  async function save(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const ok = await features.add("places", { name: form.name.trim(), address: form.address.trim(), category: form.category, collection: form.collection.trim(), latitude: form.latitude, longitude: form.longitude });
    setSaving(false);
    if (ok) setOpen(false);
  }
  async function schedule(place) {
    const ok = await onAddToSchedule({ name: place.name, location: place.address || place.name, latitude: place.latitude, longitude: place.longitude });
    setNotice(ok ? `${place.name} was added to your schedule.` : "Couldn't add that to the schedule.");
    setTimeout(() => setNotice(""), 3200);
  }

  const card = (place) => (
    <article className="place-card" key={place.id}>
      <span className="place-pin"><PinIcon /></span>
      <div>
        <strong>{place.name}</strong>
        {place.address && <small>{place.address}</small>}
        <div className="chip-row">{place.category && <em>{place.category}</em>}{place.collection && <em className="alt">{place.collection}</em>}</div>
        <div className="card-actions">
          <button type="button" onClick={() => schedule(place)}>Add to schedule</button>
          {place.latitude != null && <a href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`} target="_blank" rel="noreferrer">Maps</a>}
          {(place.created_by === userId || canManage) && <button type="button" className="danger" onClick={() => features.remove("places", place.id)}>Remove</button>}
        </div>
      </div>
    </article>
  );

  const mapItems = places.filter((p) => p.latitude != null).map((p, index) => ({ ...p, day_label: "Day 1", sort_order: index }));

  return (
    <>
      <SearchField value={query} onChange={setQuery} placeholder="Search saved places" />
      {features.places.length === 0 && features.available && <EmptyNote>No places yet. Tap + to save a place to your trip.</EmptyNote>}
      {view === "map" ? (
        <div className="places-map">{mapItems.length ? renderMap(mapItems) : <EmptyNote>Saved places with a map location show up here.</EmptyNote>}</div>
      ) : mode === "collections" ? (
        <div className="card-stack">
          {[...collections, ""].map((name) => {
            const group = places.filter((p) => (p.collection || "") === name);
            if (!group.length) return null;
            return <section key={name || "none"}><h4 className="group-heading">{name || "Not in a collection"} <span className="count-chip">{group.length}</span></h4><div className="card-stack">{group.map(card)}</div></section>;
          })}
        </div>
      ) : <div className="card-stack">{places.map(card)}</div>}
      {notice && <div className="mini-toast" role="status">{notice}</div>}
      <ActionBar className="with-plus">
        <PillTabs label="Places grouping" value={mode} onChange={setMode} items={[{ id: "all", label: "All" }, { id: "collections", label: "Collections" }]} />
        <IconToggle value={view} onChange={setView} />
        <PlusButton onClick={openNew} label="Save a place" />
      </ActionBar>
      <Sheet open={open} title="Save a place" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={save}>
          <Field label="Find a place"><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a café, museum, address…" /></Field>
          {results.length > 0 && <ul className="result-list">{results.map((r) => <li key={`${r.latitude}-${r.longitude}-${r.label}`}><button type="button" onClick={() => { setForm({ ...form, name: r.label.split(",")[0], address: r.label, latitude: r.latitude, longitude: r.longitude }); setSearch(""); setResults([]); }}>{r.label}</button></li>)}</ul>}
          <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Time Out Market" /></Field>
          <Field label="Address" hint="optional"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="sheet-grid">
            <Field label="Type" hint="optional"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Choose…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Collection" hint="optional"><input list="place-collections" value={form.collection} onChange={(e) => setForm({ ...form, collection: e.target.value })} placeholder="Day trips" /></Field>
          </div>
          <datalist id="place-collections">{collections.map((c) => <option key={c} value={c} />)}</datalist>
          {features.error && <p className="form-error">{features.error}</p>}
          <button type="submit" className="sheet-submit" disabled={saving}>{saving ? "Saving…" : "Save place"}</button>
        </form>
      </Sheet>
    </>
  );
}

/* ---------------- Events ---------------- */
function Events({ features, tripName, userId, canManage, onAddToSchedule }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", venue: "", starts_at: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const term = destinationInfo(tripName).term;

  async function save(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const ok = await features.add("events", { title: form.title.trim(), venue: form.venue.trim(), starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null, url: form.url.trim() });
    setSaving(false);
    if (ok) { setForm({ title: "", venue: "", starts_at: "", url: "" }); setOpen(false); }
  }
  async function schedule(ev) {
    const ok = await onAddToSchedule({ name: ev.title, location: ev.venue || null, latitude: null, longitude: null, when: ev.starts_at });
    setNotice(ok ? `${ev.title} was added to your schedule.` : "Couldn't add that to the schedule.");
    setTimeout(() => setNotice(""), 3200);
  }

  return (
    <>
      <div className="explore-banner">
        <small>FIND EVENTS NEAR</small>
        <strong>{term || tripName}</strong>
        <div className="chip-row">
          <a href={`https://www.google.com/search?q=${encodeURIComponent(`events in ${term} this week`)}`} target="_blank" rel="noreferrer">Search events</a>
          <a className="alt" href={`https://www.eventbrite.com/d/${encodeURIComponent(term.toLowerCase().replace(/\s+/g, "-"))}/events/`} target="_blank" rel="noreferrer">Eventbrite</a>
        </div>
      </div>
      {features.events.length === 0 && features.available && <EmptyNote>No events saved yet. Found a concert or game? Tap + to save it.</EmptyNote>}
      <div className="card-stack">
        {features.events.map((ev) => (
          <article className="place-card" key={ev.id}>
            <span className="place-pin"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg></span>
            <div>
              <strong>{ev.title}</strong>
              <small>{[formatDateTime(ev.starts_at), ev.venue].filter(Boolean).join(" · ") || "Date to be confirmed"}</small>
              <div className="card-actions">
                <button type="button" onClick={() => schedule(ev)}>Add to schedule</button>
                {ev.url && <a href={ev.url} target="_blank" rel="noreferrer">Tickets</a>}
                {(ev.created_by === userId || canManage) && <button type="button" className="danger" onClick={() => features.remove("events", ev.id)}>Remove</button>}
              </div>
            </div>
          </article>
        ))}
      </div>
      {notice && <div className="mini-toast" role="status">{notice}</div>}
      <ActionBar className="with-plus"><span className="bar-label">Save an event</span><PlusButton onClick={() => setOpen(true)} label="Save an event" /></ActionBar>
      <Sheet open={open} title="Save an event" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={save}>
          <Field label="Event"><input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Fado night at Clube de Fado" /></Field>
          <Field label="Venue" hint="optional"><input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
          <Field label="When" hint="optional"><input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
          <Field label="Tickets link" hint="optional"><input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" /></Field>
          {features.error && <p className="form-error">{features.error}</p>}
          <button type="submit" className="sheet-submit" disabled={saving}>{saving ? "Saving…" : "Save event"}</button>
        </form>
      </Sheet>
    </>
  );
}

/* ---------------- Explore ---------------- */
function mapsLink(item, term) {
  const query = [item.name, item.address, term].filter(Boolean).join(" ");
  const id = String(item.id || "").startsWith("g-") ? `&query_place_id=${encodeURIComponent(item.id.slice(2))}` : "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}${id}`;
}

function Explore({ features, tripName, onAddToSchedule }) {
  const term = destinationInfo(tripName).term || tripName;
  const [category, setCategory] = useState("coffee");
  const [centerLabel, setCenterLabel] = useState("");
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading");
  const [notice, setNotice] = useState("");
  const cache = useRef({});

  useEffect(() => {
    const key = `${term}|${category}`;
    if (cache.current[key]) { setItems(cache.current[key].results); setCenterLabel(cache.current[key].label); setState("ready"); return undefined; }
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        const response = await fetch(`/api/explore?place=${encodeURIComponent(term)}&category=${category}`);
        const payload = await response.json();
        if (cancelled) return;
        if (response.status === 404) { setState("nocenter"); return; }
        if (!response.ok) { setState("error"); return; }
        cache.current[key] = { results: payload.results || [], label: payload.center?.label || "" };
        setItems(cache.current[key].results);
        setCenterLabel(cache.current[key].label);
        setState("ready");
      } catch { if (!cancelled) setState("error"); }
    })();
    return () => { cancelled = true; };
  }, [term, category]);

  const savedNames = new Set(features.places.map((p) => p.name.toLowerCase()));
  async function save(item) {
    const ok = await features.add("places", { name: item.name, address: item.address || item.kind, category: EXPLORE.find((c) => c.id === category)?.label || "", latitude: item.latitude, longitude: item.longitude });
    setNotice(ok ? `${item.name} saved to Places.` : "Couldn't save that place.");
    setTimeout(() => setNotice(""), 3000);
  }
  async function schedule(item) {
    const ok = await onAddToSchedule({ name: item.name, location: item.address || item.name, latitude: item.latitude, longitude: item.longitude });
    setNotice(ok ? `${item.name} was added to your schedule.` : "Couldn't add that to the schedule.");
    setTimeout(() => setNotice(""), 3000);
  }

  return (
    <>
      <div className="explore-banner">
        <small>NEAR</small>
        <strong>{centerLabel || term}</strong>
        <span>Trip destination</span>
      </div>
      <div className="chip-scroll" role="tablist" aria-label="Explore categories">
        {EXPLORE.map((c) => <button key={c.id} type="button" role="tab" aria-selected={category === c.id} className={category === c.id ? "active" : ""} onClick={() => setCategory(c.id)}>{c.label}</button>)}
      </div>
      {state === "loading" && <div className="explore-grid" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div className="explore-card skeleton" key={i} />)}</div>}
      {state === "error" && <EmptyNote>Explore is taking a nap. Try again in a moment.</EmptyNote>}
      {state === "nocenter" && <EmptyNote>We couldn't find this destination on the map. Rename the trip after a city to explore nearby.</EmptyNote>}
      {state === "ready" && items.length === 0 && <EmptyNote>Nothing found nearby for this category.</EmptyNote>}
      {state === "ready" && <div className="explore-grid">
        {items.map((item) => (
          <article className="explore-card" key={item.id}>
            <a className="explore-open" href={item.mapsUrl || mapsLink(item, term)} target="_blank" rel="noreferrer" aria-label={`Open ${item.name} in Google Maps`}>
            <div className="explore-tile" style={{ "--tile": TILE_HUES[category] }}>
              <span>{item.name.slice(0, 1)}</span>
              {item.photo && <img src={item.photo} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
              {item.rating && <b className="explore-rating">★ {item.rating.toFixed(1)}</b>}
            </div>
            <strong>{item.name}</strong>
            </a>
            {item.rating && <em className="explore-reviews">{item.ratingCount.toLocaleString()} Google reviews</em>}
            <small>{[item.kind, item.address].filter(Boolean).join(" · ") || "Nearby"}</small>
            <div className="card-actions">
              <button type="button" disabled={savedNames.has(item.name.toLowerCase())} onClick={() => save(item)}>{savedNames.has(item.name.toLowerCase()) ? "Saved" : "Save"}</button>
              <button type="button" onClick={() => schedule(item)}>Schedule</button>
            </div>
          </article>
        ))}
      </div>}
      {notice && <div className="mini-toast" role="status">{notice}</div>}
    </>
  );
}

export default function PlacesTab({ features, tripName, userId, canManage, section, onSection, onAddToSchedule, renderMap }) {
  return (
    <div className="feature-pane">
      <PillTabs label="Places sections" value={section} onChange={onSection} items={[{ id: "places", label: "Places" }, { id: "explore", label: "Explore" }]} />
      <Setup available={features.available || section === "explore"} />
      {section === "places" && <SavedPlaces features={features} tripName={tripName} userId={userId} canManage={canManage} onAddToSchedule={onAddToSchedule} renderMap={renderMap} />}
      {section === "explore" && <Explore features={features} tripName={tripName} onAddToSchedule={onAddToSchedule} />}
    </div>
  );
}
