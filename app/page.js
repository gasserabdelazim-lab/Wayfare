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
      <div className="home-card">
                    <div className="eyebrow" style={{ marginBottom: 12 }}>Start a new trip</div>
        <label className="field-label">Trip name</label>
        <input
          placeholder="e.g. Bilbao & San Sebastián"
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
{loading ? "Creating…" : "Create trip"}
</button>
  </div>
  </div>
  );
}
