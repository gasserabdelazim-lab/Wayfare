"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [yourName, setYourName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createTrip() {
    if (!name.trim() || !yourName.trim()) {
      setError("Add a trip name and your name first.");
      return;
    }
    setLoading(true);
    setError("");

    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .insert({ name: name.trim() })
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
    router.push(`/trip/${trip.id}`);
  }

  return (
    <main className="home-page">
      <nav className="home-nav"><span className="brand-mark dark">WAYFARE</span><span>Plan together. Travel better.</span></nav>
      <div className="wrap home-wrap">
      <div className="home-hero">
        <div className="eyebrow">The group travel app</div>
        <h1>Your group chat finally has a plan.</h1>
        <p>
          Collect ideas, vote on what makes the cut, book the best experiences, and split every cost—all in one beautiful trip space.
        </p>
        <div className="home-features">
          <div className="home-feature"><span className="hf-dot up-dot" />Pitch ideas and vote together</div>
          <div className="home-feature"><span className="hf-dot gold-dot" />See the real per-person budget</div>
          <div className="home-feature"><span className="hf-dot teal-dot" />Know exactly who owes whom</div>
        </div>
      </div>
      <div className="home-card">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Create your trip</div>
        <label className="field-label">Where are you going?</label>
        <input
          placeholder="e.g. Barcelona"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createTrip()}
        />
        <label className="field-label">Your name</label>
        <input
          placeholder="So the group knows it's you"
          value={yourName}
          onChange={(e) => setYourName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createTrip()}
        />
        {error && <p className="form-error">{error}</p>}
        <button onClick={createTrip} disabled={loading}>
          {loading ? "Creating…" : "Start planning →"}
        </button>
      </div>
      <div className="destination-strip">
        {["Barcelona", "Paris", "Tokyo", "Dubai"].map((city) => <button key={city} className={`destination-card city-${city.toLowerCase()}`} onClick={() => setName(city)}><span>{city}</span><small>Plan this trip →</small></button>)}
      </div>
      </div>
    </main>
  );
}
