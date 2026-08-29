"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

const NAV_ITEMS = [
  { id: "plans", icon: "☷", label: "Plans" },
  { id: "settle", icon: "⇄", label: "Settle up" },
  { id: "updates", icon: "✦", label: "Updates" },
  { id: "profile", icon: "○", label: "Profile" },
];

function tripCover(name = "") {
  return name.toLowerCase().includes("barcelona")
    ? "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=700&q=78"
    : "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=78";
}

export default function Home() {
  const router = useRouter();
  const [tripName, setTripName] = useState("");
  const [yourName, setYourName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("plans");
  const [trips, setTrips] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const savedProfile = localStorage.getItem("wayfare_profile_name") || "";
    setYourName(savedProfile);
    const tripIds = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      if (key.startsWith("wayfare_name_")) tripIds.push(key.replace("wayfare_name_", ""));
    }
    if (!tripIds.length) return;
    supabase.from("trips").select("id,name,start_date,end_date,created_at,currency").in("id", tripIds)
      .then(({ data }) => setTrips((data || []).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))));
    supabase.from("activities").select("id,trip_id,name,created_at").in("trip_id", tripIds).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setRecentActivities(data || []));
  }, []);

  const tripById = useMemo(() => Object.fromEntries(trips.map((trip) => [trip.id, trip])), [trips]);

  async function createTrip() {
    if (!tripName.trim() || !yourName.trim()) {
      setError("Add a trip title and your name first.");
      return;
    }
    setLoading(true);
    setError("");
    const { data: trip, error: tripErr } = await supabase.from("trips").insert({ name: tripName.trim() }).select().single();
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
      <header className="app-header">
        <div><div className="brand-mark dark">WAYFARE</div><p>Plan together. Settle simply.</p></div>
        <div className="profile-bubble">{(yourName || "Y").slice(0, 1).toUpperCase()}</div>
      </header>

      <div className="app-content">
        {activeView === "plans" && (
          <section className="plans-home-view">
            <div className="app-welcome"><div className="eyebrow">Your trips</div><h1>Plans</h1><p>Create a trip, add suggestions, and let everyone vote.</p></div>
            {trips.length > 0 && <div className="saved-trips">
              <div className="section-title-row"><h2>In progress</h2><span>{trips.length}</span></div>
              {trips.map((trip) => (
                <button key={trip.id} className="saved-trip-card" onClick={() => router.push(`/trip/${trip.id}`)}>
                  <div className="trip-card-cover" style={{ backgroundImage: `url(${tripCover(trip.name)})` }} />
                  <div><small>GROUP PLAN</small><strong>{trip.name}</strong><span>Open proposals →</span></div>
                </button>
              ))}
            </div>}
            <section className="quick-create-card">
              <div className="eyebrow">New plan</div>
              <h2>Create a trip</h2>
              <label className="field-label">Trip title</label>
              <input placeholder="e.g. Barcelona with friends" value={tripName} onChange={(e) => setTripName(e.target.value)} />
              <label className="field-label">Your name</label>
              <input placeholder="So friends know it's you" value={yourName} onChange={(e) => setYourName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createTrip()} />
              {error && <p className="form-error">{error}</p>}
              <button onClick={createTrip} disabled={loading}>{loading ? "Creating…" : "Create plan →"}</button>
            </section>
          </section>
        )}

        {activeView === "settle" && <section className="simple-app-view">
          <div className="eyebrow">Shared expenses</div><h1>Settle up</h1><p className="view-intro">Open a trip to add expenses and see who owes whom.</p>
          {trips.length ? trips.map((trip) => <button className="feed-row" key={trip.id} onClick={() => router.push(`/trip/${trip.id}?view=settle`)}><span className="feed-icon">⇄</span><div><strong>{trip.name}</strong><small>View expenses and balances</small></div><b>›</b></button>) : <EmptyView title="Nothing to settle" text="Create your first trip from Plans." />}
        </section>}

        {activeView === "updates" && <section className="simple-app-view">
          <div className="eyebrow">Latest activity</div><h1>Updates</h1><p className="view-intro">New suggestions and changes across your plans.</p>
          {recentActivities.length ? recentActivities.map((activity) => <button className="feed-row" key={activity.id} onClick={() => router.push(`/trip/${activity.trip_id}?view=updates`)}><span className="feed-icon">✦</span><div><strong>{activity.name}</strong><small>Added to {tripById[activity.trip_id]?.name || "a group plan"}</small></div><b>›</b></button>) : <EmptyView title="No updates yet" text="New proposals and votes will appear here." />}
        </section>}

        {activeView === "profile" && <section className="simple-app-view">
          <div className="eyebrow">Profile & settings</div><h1>You</h1>
          <div className="profile-card"><div className="large-profile-bubble">{(yourName || "Y").slice(0, 1).toUpperCase()}</div><label className="field-label">Display name</label><input placeholder="Your name" value={yourName} onChange={(e) => { setYourName(e.target.value); localStorage.setItem("wayfare_profile_name", e.target.value); }} /><p>Your name and trip shortcuts stay on this device.</p></div>
        </section>}
      </div>

      <nav className="mobile-bottom-nav home-bottom-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => <button key={item.id} className={`bottom-nav-item ${activeView === item.id ? "active" : ""}`} onClick={() => setActiveView(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}
      </nav>
    </main>
  );
}

function EmptyView({ title, text }) {
  return <div className="app-empty"><span>✦</span><h3>{title}</h3><p>{text}</p></div>;
}
