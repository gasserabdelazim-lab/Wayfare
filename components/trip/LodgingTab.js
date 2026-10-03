"use client";

import { useMemo, useState } from "react";
import { ActionBar, EmptyNote, Field, PlusButton, SearchField, Setup, Sheet, formatDay } from "./ui";

const BLANK = { name: "", address: "", check_in: "", check_out: "", confirmation: "", url: "", notes: "" };

function nights(a, b) {
  if (!a || !b) return 0;
  const diff = (new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000;
  return Number.isFinite(diff) && diff > 0 ? Math.round(diff) : 0;
}

export default function LodgingTab({ features, userId, canManage }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const stays = useMemo(() => {
    const q = query.trim().toLowerCase();
    return features.lodging.filter((s) => !q || [s.name, s.address, s.confirmation].join(" ").toLowerCase().includes(q));
  }, [features.lodging, query]);

  function openNew() { setEditingId(null); setForm(BLANK); setOpen(true); }
  function openEdit(stay) { setEditingId(stay.id); setForm({ ...BLANK, ...stay, check_in: stay.check_in || "", check_out: stay.check_out || "" }); setOpen(true); }
  async function save(event) {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const row = {
      name: form.name.trim(), address: form.address.trim(), check_in: form.check_in || null, check_out: form.check_out || null,
      confirmation: form.confirmation.trim(), url: form.url.trim(), notes: form.notes.trim(),
    };
    const ok = editingId ? await features.patch("lodging", editingId, row) : await features.add("lodging", row);
    setSaving(false);
    if (ok) setOpen(false);
  }

  return (
    <div className="feature-pane">
      <Setup available={features.available} />
      {features.lodging.length === 0 && features.available && <EmptyNote>No lodging yet. Add where you'll be sleeping.</EmptyNote>}
      <div className="card-stack">
        {stays.map((stay) => {
          const n = nights(stay.check_in, stay.check_out);
          return (
            <article className="stay-card" key={stay.id}>
              <h4>{stay.name}</h4>
              {stay.address && <a className="card-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stay.name} ${stay.address}`)}`} target="_blank" rel="noreferrer">{stay.address}</a>}
              <div className="stay-dates">
                <div><small>Check in</small><strong>{formatDay(stay.check_in) || "—"}</strong></div>
                <div><small>Check out</small><strong>{formatDay(stay.check_out) || "—"}</strong></div>
                {n > 0 && <div><small>Stay</small><strong>{n} night{n === 1 ? "" : "s"}</strong></div>}
              </div>
              {(stay.confirmation || stay.notes) && <p className="card-note">{stay.confirmation && <b>Ref {stay.confirmation}</b>} {stay.notes}</p>}
              {stay.url && <a className="card-link" href={stay.url} target="_blank" rel="noreferrer">Open booking</a>}
              {(stay.created_by === userId || canManage) && <footer><button type="button" onClick={() => openEdit(stay)}>Edit</button><button type="button" className="danger" onClick={() => { if (window.confirm("Remove this stay?")) features.remove("lodging", stay.id); }}>Remove</button></footer>}
            </article>
          );
        })}
      </div>
      <ActionBar className="with-plus">
        <SearchField value={query} onChange={setQuery} placeholder="Search lodging" />
        <PlusButton onClick={openNew} label="Add a stay" />
      </ActionBar>
      <Sheet open={open} title={editingId ? "Edit stay" : "Add a stay"} onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={save}>
          <Field label="Name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Casa do Bairro Alto" /></Field>
          <Field label="Address" hint="optional"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua da Rosa 12, Lisbon" /></Field>
          <div className="sheet-grid">
            <Field label="Check in"><input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /></Field>
            <Field label="Check out"><input type="date" min={form.check_in || undefined} value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /></Field>
          </div>
          <Field label="Confirmation" hint="optional"><input value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} /></Field>
          <Field label="Booking link" hint="optional"><input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" /></Field>
          <Field label="Notes" hint="optional"><input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Door code, host name…" /></Field>
          {features.error && <p className="form-error">{features.error}</p>}
          <button type="submit" className="sheet-submit" disabled={saving}>{saving ? "Saving…" : editingId ? "Save changes" : "Add stay"}</button>
        </form>
      </Sheet>
    </div>
  );
}
