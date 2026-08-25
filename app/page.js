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
    <div className="wrap">
      <div className="eyebrow">Wayfare</div>
      <h1 style={{ fontSize: 28, marginTop: 8 }}>Plan the trip together</h1>
      <p style={{ color: "var(--ink)", opacity: 0.7, marginTop: 8, lineHeight: 1.6 }}>
        Propose the itinerary, everyone votes, costs split themselves out. No accounts, just a link.
      </p>
      <div className="home-card">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Start a new trip</div>
        <input
          placeholder="Trip name — e.g. Bilbao & San Sebastián"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Your name"
          value={yourName}
          onChange={(e) => setYourName(e.target.value)}
        />
        {error && <p style={{ color: "var(--coral)", fontSize: 13 }}>{error}</p>}
        <button onClick={createTrip} disabled={loading}>
          {loading ? "Creating…" : "Create trip"}
        </button>
      </div>
    </div>
  );
}
