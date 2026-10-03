"use client";

import { useMemo, useState } from "react";
import { ActionBar, EmptyNote, SearchField, Setup, initials, timeAgo } from "./ui";

function renderBody(text, names) {
  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") || "$^"}))`, "gi");
  return String(text).split(pattern).map((part, index) => (index % 2 === 1 ? <span className="mention" key={index}>{part}</span> : part));
}

export default function WallTab({ features, userId, travelers, myName, onMembers, canManage }) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const names = useMemo(() => travelers.map((t) => t.name).filter(Boolean), [travelers]);

  const posts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return features.posts.filter((p) => !q || `${p.body} ${p.author_name}`.toLowerCase().includes(q));
  }, [features.posts, query]);
  const reactionsFor = (id) => features.reactions.filter((r) => r.post_id === id);

  async function post(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    const ok = await features.add("posts", { body, author_name: myName || "" });
    setPosting(false);
    if (ok) setDraft("");
  }

  const mentionMatch = draft.match(/@(\w*)$/);
  const suggestions = mentionMatch ? names.filter((n) => n.toLowerCase().startsWith(mentionMatch[1].toLowerCase())).slice(0, 4) : [];

  return (
    <div className="feature-pane wall-pane">
      <Setup available={features.available} />
      <div className="wall-top">
        <SearchField value={query} onChange={setQuery} placeholder="Search the feed…" />
        <button type="button" className="members-chip" onClick={onMembers} aria-label="See who is on this trip">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2" /><circle cx="17" cy="9" r="2.6" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.3c2.5.3 4.5 2.3 4.5 5.2" /></svg>
          {travelers.length}
        </button>
      </div>
      {features.posts.length === 0 && features.available && <EmptyNote>Nothing here yet. Be the first to post.</EmptyNote>}
      <div className="card-stack">
        {posts.map((post) => {
          const reactions = reactionsFor(post.id);
          const mine = reactions.some((r) => r.user_id === userId);
          return (
            <article className="wall-post" key={post.id}>
              <header><i>{initials(post.author_name)}</i><div><strong>{post.author_name || "Traveler"}</strong><small>{timeAgo(post.created_at)}</small></div>
                {(post.created_by === userId || canManage) && <button type="button" className="row-remove" aria-label="Delete post" onClick={() => features.remove("posts", post.id)}>×</button>}
              </header>
              <p>{renderBody(post.body, names)}</p>
              <button type="button" className={`reaction ${mine ? "on" : ""}`} aria-pressed={mine} onClick={() => features.toggleReaction(post.id, mine)}>
                <svg viewBox="0 0 24 24" width="17" height="17" fill={mine ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
                {reactions.length > 0 ? reactions.length : "Like"}
              </button>
            </article>
          );
        })}
      </div>
      <ActionBar className="with-plus composer-bar">
        {suggestions.length > 0 && <div className="mention-list">{suggestions.map((n) => <button type="button" key={n} onClick={() => setDraft(draft.replace(/@\w*$/, `@${n} `))}>@{n}</button>)}</div>}
        <form className="composer-form" onSubmit={post}>
          <label className="search-field">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
            <input value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} placeholder="Post something…" aria-label="Post something" />
          </label>
          <button type="submit" className="plus-button send" disabled={!draft.trim() || posting} aria-label="Send">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        </form>
      </ActionBar>
    </div>
  );
}
