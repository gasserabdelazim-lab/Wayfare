"use client";

import { initials } from "./ui";

/** Who's on the trip, how to invite more people, and a place to ask the group a question. */
export default function PeopleTab({ travelers, joinCode, onCopyCode, onInvite, canManage, pollsSlot }) {
  return (
    <div className="feature-pane people-pane">
      <section className="people-card">
        <header>
          <div><span className="eyebrow">WHO'S IN</span><h3>{travelers.length} {travelers.length === 1 ? "traveler" : "travelers"}</h3></div>
          <button type="button" className="people-invite" onClick={onInvite}>{canManage ? "Invite" : "Share link"}</button>
        </header>
        <ul className="people-list">
          {travelers.map((t) => (
            <li key={t.id}><i>{initials(t.name)}</i><span>{t.name}</span>{t.role === "owner" && <em>Owner</em>}</li>
          ))}
        </ul>
      </section>

      {joinCode && <section className="trip-code-row" aria-label="Trip join code">
        <div><small>TRIP CODE</small><strong>{joinCode}</strong></div>
        <button type="button" onClick={onCopyCode}>Copy</button>
        <span>Friends enter it under "Join with code" on their home screen.</span>
      </section>}

      <div className="polls-slot">{pollsSlot}</div>
    </div>
  );
}
