"use client";

import { useState } from "react";

const choices = [
  { value: "up", label: "I'm in", icon: "✓" },
  { value: "meh", label: "Maybe", icon: "~" },
  { value: "down", label: "I'll pass", icon: "−" },
];

export default function ActivityPolls({ activities, votesByActivity, commentsByActivity, travelers, travelerId, onVote, onComment, onAdd, onView }) {
  const [onlyUnvoted, setOnlyUnvoted] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const remaining = activities.filter((a) => !(votesByActivity[a.id] || []).some((v) => v.traveler_id === travelerId));
  const visible = onlyUnvoted ? remaining : activities;

  async function vote(id, value) {
    if (pending) return;
    setPending(id);
    setError("");
    try { await onVote(id, value); }
    catch { setError("Your vote couldn't be saved. Please try again."); }
    finally { setPending(null); }
  }

  return <section className="group-polls" aria-label="Activity polls">
    <div className="group-section-heading"><div><span className="eyebrow">Everyone gets a say</span><h3>Activity ideas</h3></div></div>
    <div className="poll-filter" role="group" aria-label="Filter activity polls">
      <button aria-pressed={!onlyUnvoted} onClick={() => setOnlyUnvoted(false)}>All ideas <b>{activities.length}</b></button>
      <button aria-pressed={onlyUnvoted} onClick={() => setOnlyUnvoted(true)}>Your turn <b>{remaining.length}</b></button>
    </div>
    {error && <p role="alert">{error}</p>}
    {!visible.length && <div className="poll-empty"><strong>{activities.length ? "You're all caught up." : "Every trip starts with an idea."}</strong><p>{activities.length ? "Your votes are in. Add another idea for the group." : "Suggest a place or activity and invite your friends to vote."}</p></div>}
    {visible.map((activity) => {
      const votes = votesByActivity[activity.id] || [];
      const mine = votes.find((v) => v.traveler_id === travelerId)?.value;
      return <article className="poll-card" id={`group-post-${activity.id}`} key={activity.id} aria-label={`Poll: ${activity.name}`}>
        <div className="poll-card-top"><span>{activity.day_label || "Trip idea"}</span><span>{mine ? "You voted ✓" : "Have your say"}</span></div>
        <h4>{activity.name}</h4>
        {activity.location && <p className="poll-place">{activity.location}</p>}
        <div className="poll-options">
          {choices.map((choice) => {
            const count = votes.filter((v) => v.value === choice.value).length;
            const percent = votes.length ? Math.round(count / votes.length * 100) : 0;
            return <button key={choice.value} className={`poll-option option-${choice.value}`} aria-pressed={mine === choice.value} disabled={!travelerId || Boolean(pending)} onClick={() => vote(activity.id, choice.value)}>
              <span className="poll-fill" style={{ width: `${percent}%` }} aria-hidden="true" />
              <span className="poll-option-label"><i aria-hidden="true">{choice.icon}</i>{choice.label}</span><span className="poll-option-count">{count} · {percent}%</span>
            </button>;
          })}
        </div>
        <div className="poll-card-footer"><div className="poll-people">{votes.slice(0, 4).map((v) => {
          const person = travelers.find((t) => t.id === v.traveler_id);
          if (!person) return null;
          return <span key={v.traveler_id} title={`${person.name}: ${choices.find((c) => c.value === v.value)?.label}`}>{/^https:\/\/|^data:image/.test(person.avatar || "") ? <img src={person.avatar} alt={person.name} /> : person.avatar || person.name.slice(0, 1)}</span>;
        })}<small aria-live="polite">{pending === activity.id ? "Saving…" : `${votes.length} of ${travelers.length} voted`}</small></div><button className="poll-view" onClick={() => onView(activity.id)}>Details ↗</button></div>
        <ActivityDiscussion comments={commentsByActivity[activity.id] || []} onComment={(text) => onComment(activity.id, text)} disabled={!travelerId} />
      </article>;
    })}
    <button className="poll-add" onClick={onAdd}>＋ Suggest an activity</button>
  </section>;
}

function ActivityDiscussion({ comments, onComment, disabled }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  return <div className="post-discussion">
    {comments.map(c => <p key={c.id}><strong>{c.travelers?.name || "Someone"}</strong> {c.text}</p>)}
    <form onSubmit={async e => { e.preventDefault(); if (!text.trim() || sending) return; setSending(true); setError(""); try { await onComment(text); setText(""); } catch { setError("Comment wasn't saved. Try again."); } finally { setSending(false); } }}>
      <input aria-label="Comment on this activity" placeholder="What do you think?" value={text} maxLength={1000} disabled={disabled || sending} onChange={e => setText(e.target.value)} /><button disabled={disabled || sending || !text.trim()}>{sending ? "Sending…" : "Send"}</button>
    </form>{error && <p role="alert">{error}</p>}
  </div>;
}
