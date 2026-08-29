"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

const DESTINATIONS = [
  { name: "Barcelona", className: "city-barcelona", tag: "Architecture · food · beach" },
  { name: "Paris", className: "city-paris", tag: "Museums · cafés · day trips" },
  { name: "Tokyo", className: "city-tokyo", tag: "Food · culture · nightlife" },
  { name: "Dubai", className: "city-dubai", tag: "Attractions · desert · dining" },
];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [yourName, setYourName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("trips");
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    const savedProfile = localStorage.getItem("wayfare_profile_name") || "";
    setYourName(savedProfile);
    const tripIds = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (key.startsWith("wayfare_name_")) tripIds.push(key.replace("wayfare_name_", ""));
    }
    if (tripIds.length) {
      supabase.from("trips").select("id,name,start_date,end_date,created_at").in("id", tripIds)
        .then(({ data }) => setTrips((data || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))));
    }
  }, []);

  async function createTrip() {
    if (!name.trim() || !yourName.trim()) {
      setError("Add a destination and your name first.");
      return;
    }
    setLoading(true);
    setError("");
    const { data: trip, error: tripErr } = await supabase.from("trips").insert({ name: name.trim() }).select().single();
    if (tripErr) {
      setError(`Couldn't create the trip: ${tripErr.message || "try again."}`);
      setLoading(false);
      return;
    }
    const { error: travelerErr } = await supabase.from("travelers").insert({ trip_id: trip.id, name: yourName.trim() });
    if (travelerErr) {
      setError("Trip created, but couldn't add you as a traveler.");
      setLoading(false);
      return;
    }
    localStorage.setItem(`wayfare_name_${trip.id}`, yourName.trim());
    localStorage.setItem("wayfare_profile_name", yourName.trim());
    router.push(`/trip/${trip.id}`);
  }

  return (
    <main className="mobile-app-home">
      <header className="app-header"><div><div className="brand-mark dark">WAYFARE</div><p>Plan together. Travel better.</p></div><div className="profile-bubble">{(yourName || "You").slice(0, 1).toUpperCase()}</div></header>
      <div className="app-content">
        {activeView === "trips" && <>
          <section className="app-welcome"><div className="eyebrow">Your next adventure</div><h1>Where are we going?</h1><p>Turn the group chat into a plan everyone can agree on.</p></section>
          {trips.length > 0 && <section className="saved-trips"><div className="section-title-row"><h2>Your trips</h2><span>{trips.length}</span></div>{trips.map((trip) => <button key={trip.id} className="saved-trip-card" onClick={() => router.push(`/trip/${trip.id}`)}><div className="trip-card-cover" style={{ backgroundImage: `url(${trip.name.toLowerCase().includes("barcelona") ? "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=700&q=75" : "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=75"})` }} /><div><small>GROUP TRIP</small><strong>{trip.name}</strong><span>Open plan →</span></div></button>)}</section>}
          <section className="quick-create-card">
            <div className="eyebrow">Start a new trip</div>
            <label className="field-label">Destination or trip name</label><input placeholder="e.g. Barcelona" value={name} onChange={(e) => setName(e.target.value)} />
            <label className="field-label">Your name</label><input placeholder="So friends know it's you" value={yourName} onChange={(e) => setYourName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTrip()} />
            {error && <p className="form-error">{error}</p>}
            <button onClick={createTrip} disabled={loading}>{loading ? "Creating…" : "Create trip →"}</button>
          </section>
        </>}
        {activeView === "explore" && <section className="explore-view"><div className="eyebrow">Klook-style discovery</div><h1>Find your next escape</h1><p>Choose a destination, then add bookable experiences to the group plan.</p><div className="explore-categories"><span>Attractions</span><span>Tours</span><span>Food</span><span>Transport</span></div><div className="explore-grid">{DESTINATIONS.map((city) => <button key={city.name} className={`explore-card ${city.className}`} onClick={() => { setName(city.name); setActiveView("trips"); }}><strong>{city.name}</strong><small>{city.tag}</small><span>Start planning →</span></button>)}</div></section>}
        {activeView === "activity" && <section className="simple-app-view"><div className="eyebrow">Recent activity</div><h1>Your travel feed</h1>{trips.length ? trips.map((trip) => <button className="feed-row" key={trip.id} onClick={() => router.push(`/trip/${trip.id}`)}><span className="feed-icon">✦</span><div><strong>{trip.name}</strong><small>Open the latest group plan and votes</small></div><b>›</b></button>) : <div className="app-empty"><span>✦</span><h3>No activity yet</h3><p>Create a trip and your group updates will live here.</p></div>}</section>}
        {activeView === "profile" && <section className="simple-app-view"><div className="eyebrow">Profile</div><h1>Your Wayfare</h1><div className="profile-card"><div className="large-profile-bubble">{(yourName || "Y").slice(0, 1).toUpperCase()}</div><label className="field-label">Display name</label><input placeholder="Your name" value={yourName} onChange={(e) => { setYourName(e.target.value); localStorage.setItem("wayfare_profile_name", e.target.value); }} /><p>No account required. Your name and trip shortcuts stay on this device.</p></div></section>}
      </div>
      <nav className="mobile-bottom-nav home-bottom-nav">
        <button className={`bottom-nav-item ${activeView === "trips" ? "active" : ""}`} onClick={() => setActiveView("trips")}><span>⌂</span><small>Trips</small></button>
        <button className={`bottom-nav-item ${activeView === "explore" ? "active" : ""}`} onClick={() => setActiveView("explore")}><span>⌕</span><small>Explore</small></button>
        <button className={`bottom-nav-item ${activeView === "activity" ? "active" : ""}`} onClick={() => setActiveView("activity")}><span>✦</span><small>Activity</small></button>
        <button className={`bottom-nav-item ${activeView === "profile" ? "active" : ""}`} onClick={() => setActiveView("profile")}><span>○</span><small>Profile</small></button>
      </nav>
    </main>
  );
}
