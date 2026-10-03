"use client";

import { useMemo, useState } from "react";
import { ActionBar, EmptyNote, Field, PlusButton, SearchField, Setup, Sheet, formatDateTime, initials, toLocalInput } from "./ui";

const BLANK = { airline: "", flight_number: "", from_place: "", to_place: "", departs_at: "", arrives_at: "", confirmation: "", notes: "" };

function code(value) {
  const text = String(value || "").trim();
  if (!text) return "—";
  return /^[A-Za-z]{3}$/.test(text) ? text.toUpperCase() : text.length > 12 ? `${text.slice(0, 11)}…` : text;
}

export default function FlightsTab({ features, userId, travelers, canManage }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const nameFor = (uid) => travelers.find((t) => t.user_id === uid)?.name || "Traveler";
  const flights = useMemo(() => {
    const q = query.trim().toLowerCase();
    return features.flights.filter((f) => !q || [f.airline, f.flight_number, f.from_place, f.to_place, f.confirmation, nameFor(f.created_by)].join(" ").toLowerCase().includes(q));
  }, [features.flights, query, travelers]);

  function openNew() { setEditingId(null); setForm(BLANK); setOpen(true); }
  function openEdit(flight) {
    setEditingId(flight.id);
    setForm({ ...BLANK, ...flight, departs_at: toLocalInput(flight.departs_at), arrives_at: toLocalInput(flight.arrives_at) });
    setOpen(true);
  }
  async function save(event) {
    event.preventDefault();
    if (!form.from_place.trim() && !form.flight_number.trim()) return;
    setSaving(true);
    const row = {
      airline: form.airline.trim(), flight_number: form.flight_number.trim(),
      from_place: form.from_place.trim(), to_place: form.to_place.trim(),
      departs_at: form.departs_at ? new Date(form.departs_at).toISOString() : null,
      arrives_at: form.arrives_at ? new Date(form.arrives_at).toISOString() : null,
      confirmation: form.confirmation.trim(), notes: form.notes.trim(),
    };
    const ok = editingId ? await features.patch("flights", editingId, row) : await features.add("flights", row);
    setSaving(false);
    if (ok) setOpen(false);
  }

  return (
    <div className="feature-pane">
      <Setup available={features.available} />
      {features.flights.length === 0 && features.available && <EmptyNote>No flights yet. Add yours so the group can see who lands when.</EmptyNote>}
      <div className="card-stack">
        {flights.map((flight) => {
          const mine = flight.created_by === userId;
          return (
            <article className="flight-card" key={flight.id}>
              <header>
                <span className="flight-who"><i>{initials(nameFor(flight.created_by))}</i>{mine ? "You" : nameFor(flight.created_by)}</span>
                <span className="flight-number">{[flight.airline, flight.flight_number].filter(Boolean).join(" · ") || "Flight"}</span>
              </header>
              <div className="flight-route">
                <div><strong>{code(flight.from_place)}</strong><small>{formatDateTime(flight.departs_at) || "Departure time"}</small></div>
                <svg viewBox="0 0 48 12" width="48" height="12" aria-hidden="true"><path d="M1 6h42M38 1l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div className="to"><strong>{code(flight.to_place)}</strong><small>{formatDateTime(flight.arrives_at) || "Arrival time"}</small></div>
              </div>
              {(flight.confirmation || flight.notes) && <p className="card-note">{flight.confirmation && <b>Ref {flight.confirmation}</b>} {flight.notes}</p>}
              {(mine || canManage) && <footer><button type="button" onClick={() => openEdit(flight)}>Edit</button><button type="button" className="danger" onClick={() => { if (window.confirm("Remove this flight?")) features.remove("flights", flight.id); }}>Remove</button></footer>}
            </article>
          );
        })}
      </div>
      <ActionBar className="with-plus">
        <SearchField value={query} onChange={setQuery} placeholder="Search flights" />
        <PlusButton onClick={openNew} label="Add a flight" />
      </ActionBar>
      <Sheet open={open} title={editingId ? "Edit flight" : "Add your flight"} onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={save}>
          <div className="sheet-grid">
            <Field label="Airline"><input value={form.airline} onChange={(e) => setForm({ ...form, airline: e.target.value })} placeholder="TAP Air Portugal" /></Field>
            <Field label="Flight number"><input value={form.flight_number} onChange={(e) => setForm({ ...form, flight_number: e.target.value })} placeholder="TP 205" /></Field>
            <Field label="From"><input value={form.from_place} onChange={(e) => setForm({ ...form, from_place: e.target.value })} placeholder="JFK" /></Field>
            <Field label="To"><input value={form.to_place} onChange={(e) => setForm({ ...form, to_place: e.target.value })} placeholder="LIS" /></Field>
            <Field label="Departs"><input type="datetime-local" value={form.departs_at} onChange={(e) => setForm({ ...form, departs_at: e.target.value })} /></Field>
            <Field label="Arrives"><input type="datetime-local" value={form.arrives_at} onChange={(e) => setForm({ ...form, arrives_at: e.target.value })} /></Field>
          </div>
          <Field label="Confirmation" hint="optional"><input value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} placeholder="ABC123" /></Field>
          <Field label="Notes" hint="optional"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Terminal, seat, pickup…" /></Field>
          {features.error && <p className="form-error">{features.error}</p>}
          <button type="submit" className="sheet-submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add flight"}</button>
        </form>
      </Sheet>
    </div>
  );
}
