"use client";

import { useMemo, useState } from "react";
import { ActionBar, EmptyNote, Field, PillTabs, PlusButton, Setup, Sheet, formatDay, initials } from "./ui";

const TASK_FILTERS = [
  { id: "all", label: "All tasks" },
  { id: "mine", label: "Assigned to me" },
  { id: "open", label: "Open" },
  { id: "done", label: "Done" },
];

function Tasks({ features, travelers, myTraveler }) {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", assignee_id: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  const nameFor = (id) => travelers.find((t) => t.id === id)?.name || "";

  const tasks = useMemo(() => features.tasks.filter((task) => {
    if (filter === "mine") return myTraveler && task.assignee_id === myTraveler.id;
    if (filter === "open") return !task.done;
    if (filter === "done") return task.done;
    return true;
  }).sort((a, b) => Number(a.done) - Number(b.done)), [features.tasks, filter, myTraveler]);

  async function save(event) {
    event.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const ok = await features.add("tasks", { title: form.title.trim(), assignee_id: form.assignee_id || null, due_date: form.due_date || null });
    setSaving(false);
    if (ok) { setForm({ title: "", assignee_id: "", due_date: "" }); setOpen(false); }
  }

  return (
    <>
      {features.tasks.length === 0 && features.available && <EmptyNote>No tasks yet. Someone has to book the ferry. Put it here.</EmptyNote>}
      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={task.done ? "done" : ""}>
            <button type="button" className="task-check" aria-label={task.done ? "Mark as not done" : "Mark as done"} aria-pressed={task.done} onClick={() => features.patch("tasks", task.id, { done: !task.done })}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </button>
            <div><strong>{task.title}</strong><small>{[nameFor(task.assignee_id) && `For ${nameFor(task.assignee_id)}`, task.due_date && `Due ${formatDay(task.due_date)}`].filter(Boolean).join(" · ") || "Anyone can take this"}</small></div>
            <button type="button" className="row-remove" aria-label="Remove task" onClick={() => features.remove("tasks", task.id)}>×</button>
          </li>
        ))}
      </ul>
      <ActionBar className="with-plus">
        <label className="select-pill"><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter tasks">{TASK_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
        <PlusButton onClick={() => setOpen(true)} label="New task" />
      </ActionBar>
      <Sheet open={open} title="New task" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={save}>
          <Field label="What needs doing?"><input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Book the ferry" /></Field>
          <div className="sheet-grid">
            <Field label="Assign to" hint="optional"><select value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}><option value="">Anyone</option>{travelers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            <Field label="Due" hint="optional"><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
          </div>
          {features.error && <p className="form-error">{features.error}</p>}
          <button type="submit" className="sheet-submit" disabled={saving}>{saving ? "Saving…" : "Add task"}</button>
        </form>
      </Sheet>
    </>
  );
}

function Checklists({ features }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(false);

  async function createList(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const ok = await features.add("checklists", { title: title.trim() });
    setSaving(false);
    if (ok) { setTitle(""); setOpen(false); }
  }
  async function addItem(list, event) {
    event.preventDefault();
    const text = (drafts[list.id] || "").trim();
    if (!text) return;
    setDrafts((current) => ({ ...current, [list.id]: "" }));
    await features.add("items", { checklist_id: list.id, text });
  }

  return (
    <>
      {features.checklists.length === 0 && features.available && <EmptyNote>No checklists yet. Start a packing list or a to-do before you go.</EmptyNote>}
      <div className="card-stack">
        {features.checklists.map((list) => {
          const items = features.items.filter((item) => item.checklist_id === list.id);
          const done = items.filter((item) => item.done).length;
          return (
            <article className="checklist-card" key={list.id}>
              <header>
                <h4>{list.title}</h4>
                <span className="count-chip">{done}/{items.length}</span>
                <button type="button" className="row-remove" aria-label={`Delete ${list.title}`} onClick={() => { if (window.confirm(`Delete "${list.title}"?`)) features.remove("checklists", list.id); }}>×</button>
              </header>
              {items.length > 0 && <div className="progress-track" aria-hidden="true"><i style={{ width: `${(done / items.length) * 100}%` }} /></div>}
              <ul className="task-list compact">
                {items.map((item) => (
                  <li key={item.id} className={item.done ? "done" : ""}>
                    <button type="button" className="task-check" aria-pressed={item.done} aria-label={item.done ? "Mark as not done" : "Mark as done"} onClick={() => features.patch("items", item.id, { done: !item.done })}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                    </button>
                    <div><strong>{item.text}</strong></div>
                    <button type="button" className="row-remove" aria-label="Remove item" onClick={() => features.remove("items", item.id)}>×</button>
                  </li>
                ))}
              </ul>
              <form className="inline-add" onSubmit={(event) => addItem(list, event)}>
                <input value={drafts[list.id] || ""} onChange={(e) => setDrafts({ ...drafts, [list.id]: e.target.value })} placeholder="Add an item" aria-label={`Add item to ${list.title}`} />
                <button type="submit" disabled={!(drafts[list.id] || "").trim()}>Add</button>
              </form>
            </article>
          );
        })}
      </div>
      <ActionBar className="with-plus">
        <span className="bar-label">New checklist</span>
        <PlusButton onClick={() => setOpen(true)} label="New checklist" />
      </ActionBar>
      <Sheet open={open} title="New checklist" onClose={() => setOpen(false)}>
        <form className="sheet-form" onSubmit={createList}>
          <Field label="Title"><input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Packing list" /></Field>
          {features.error && <p className="form-error">{features.error}</p>}
          <button type="submit" className="sheet-submit" disabled={saving}>{saving ? "Saving…" : "Create checklist"}</button>
        </form>
      </Sheet>
    </>
  );
}

export default function GroupTab({ features, travelers, myTraveler, section, onSection, pollsSlot }) {
  return (
    <div className="feature-pane">
      <PillTabs label="Group sections" value={section} onChange={onSection} items={[{ id: "tasks", label: "Tasks" }, { id: "polls", label: "Polls" }, { id: "checklists", label: "Checklists" }]} />
      <Setup available={features.available || section === "polls"} />
      {section === "tasks" && <Tasks features={features} travelers={travelers} myTraveler={myTraveler} />}
      {section === "polls" && <div className="polls-slot">{pollsSlot}</div>}
      {section === "checklists" && <Checklists features={features} />}
    </div>
  );
}
