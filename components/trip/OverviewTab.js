"use client";

import { useMemo } from "react";
import { ActionBar, Setup, formatDateTime, formatDay, initials } from "./ui";

const RSVP = [
  { id: "going", label: "Going" },
  { id: "maybe", label: "Maybe" },
  { id: "not_going", label: "Not going" },
];

function headline(status, count) {
  if (status === "going") return "You're going!";
  if (status === "maybe") return "Still deciding?";
  if (status === "not_going") return "Maybe next time";
  return count > 1 ? "Are you in?" : "Ready when you are";
}

export default function OverviewTab({ tripName, dateLabel, photo, travelers, features, userId, myTraveler, activities, nextDestination, onTab, onMembers, canManage, joinCode, onCopyCode }) {
  const myRsvp = features.rsvps.find((r) => r.user_id === userId)?.status || "";
  const counts = useMemo(() => {
    const result = { going: 0, maybe: 0, not_going: 0 };
    features.rsvps.forEach((r) => { if (result[r.status] !== undefined) result[r.status] += 1; });
    return result;
  }, [features.rsvps]);
  const answeredIds = new Set(features.rsvps.map((r) => r.user_id));
  const unanswered = travelers.filter((t) => t.user_id && !answeredIds.has(t.user_id)).length;
  const goingMembers = travelers.filter((t) => features.rsvps.some((r) => r.user_id === t.user_id && r.status === "going"));

  const myFlights = features.flights.filter((f) => f.created_by === userId);
  const nextStay = features.lodging[0];
  const upcoming = useMemo(() => [...activities]
    .sort((a, b) => String(a.day_date || "9999").localeCompare(String(b.day_date || "9999")) || Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .slice(0, 3), [activities]);
  const myTasks = features.tasks.filter((t) => !t.done && myTraveler && t.assignee_id === myTraveler.id);

  return (
    <div className="feature-pane overview-pane">
      <section className="overview-hero" style={{ backgroundImage: `linear-gradient(to top, rgba(6,12,28,.92), rgba(6,12,28,.15) 70%), url(${photo})` }}>
        <small>{travelers.length} TRAVELER{travelers.length === 1 ? "" : "S"}</small>
        <h2>{headline(myRsvp, travelers.length)}</h2>
        <p>{nextDestination}{dateLabel ? ` · ${dateLabel}` : ""}</p>
      </section>

      {joinCode && <section className="trip-code-row" aria-label="Trip join code">
        <div><small>TRIP CODE</small><strong>{joinCode}</strong></div>
        <button type="button" onClick={onCopyCode}>Copy</button>
        <span>Friends enter it under "Join with code" on their home screen.</span>
      </section>}

      <section className="who-card">
        <header>
          <span className="eyebrow">WHO'S IN</span>
          <button type="button" className="stack-button" onClick={onMembers} aria-label="See everyone on this trip">
            <span className="avatar-stack">{(goingMembers.length ? goingMembers : travelers).slice(0, 4).map((t) => <i key={t.id}>{initials(t.name)}</i>)}</span>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
          </button>
        </header>
        <div className="who-counts">
          <div><strong>{counts.going}</strong><span><b className="dot going" />Going</span></div>
          <div><strong>{counts.maybe}</strong><span><b className="dot maybe" />Maybe</span></div>
          <div><strong>{counts.not_going}</strong><span><b className="dot out" />Not going</span></div>
        </div>
        {unanswered > 0 && <p className="who-note">{unanswered} {unanswered === 1 ? "person hasn't" : "people haven't"} answered yet.</p>}
      </section>

      <Setup available={features.available} />

      <section className="overview-section">
        <div className="overview-section-head"><h3>Up next</h3><button type="button" onClick={() => onTab("plan", "schedule")}>{upcoming.length ? "Full schedule" : "+ Plan something"}</button></div>
        {upcoming.length === 0 ? <p className="empty-note small">Nothing planned yet. Add events and bookings to build the itinerary.</p> : upcoming.map((a) => (
          <article className="mini-card" key={a.id}><strong>{a.name}</strong><small>{[a.day_label, a.day_date && formatDay(a.day_date), a.time_text && a.time_text !== "Add time" ? a.time_text : ""].filter(Boolean).join(" · ")}</small></article>
        ))}
      </section>

      <section className="overview-section">
        <div className="overview-section-head"><h3>Travel</h3><button type="button" onClick={() => onTab("plan", "flights")}>{myFlights.length || nextStay ? "Manage" : "+ Add"}</button></div>
        {myFlights.length === 0 ? <p className="empty-note small">No flights yet. Add yours so the group can see who lands when.</p> : myFlights.slice(0, 2).map((f) => (
          <article className="mini-card" key={f.id}><strong>{[f.from_place, f.to_place].filter(Boolean).join(" → ") || "Flight"}</strong><small>{[f.airline, f.flight_number, formatDateTime(f.departs_at)].filter(Boolean).join(" · ")}</small></article>
        ))}
        {!nextStay ? <p className="empty-note small">No lodging yet. Add where you'll be sleeping.</p> : <article className="mini-card"><strong>{nextStay.name}</strong><small>{[nextStay.check_in && formatDay(nextStay.check_in), nextStay.check_out && formatDay(nextStay.check_out)].filter(Boolean).join(" → ")}</small></article>}
      </section>

      {myTasks.length > 0 && <section className="overview-section">
        <div className="overview-section-head"><h3>Waiting on you</h3><button type="button" onClick={() => onTab("group", "tasks")}>Open tasks</button></div>
        {myTasks.slice(0, 3).map((t) => <article className="mini-card" key={t.id}><strong>{t.title}</strong>{t.due_date && <small>Due {formatDay(t.due_date)}</small>}</article>)}
      </section>}

      <ActionBar className="rsvp-bar">
        <label className={`rsvp-select ${myRsvp}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12.5 3 3 5-6" /></svg>
          <select value={myRsvp} onChange={(e) => features.setRsvp(e.target.value)} aria-label="Your RSVP">
            {!myRsvp && <option value="" disabled>RSVP</option>}
            {RSVP.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <svg className="chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7 9 5-4 5 4M7 15l5 4 5-4" /></svg>
        </label>
        <button type="button" className="members-chip" onClick={onMembers} aria-label={canManage ? "Invite or manage travelers" : "View travelers"}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><circle cx="17" cy="9" r="2.6" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.3c2.5.3 4.5 2.3 4.5 5.2" /></svg>
          {travelers.length}
        </button>
      </ActionBar>
    </div>
  );
}
