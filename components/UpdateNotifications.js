"use client";
import NavIcon from "./NavIcon";

export function UpdateBadge({ count }) {
  return <span className="notification-icon"><NavIcon name="updates" />{count > 0 && <span className="notification-badge" aria-label={`${count} unread updates`}>{count > 99 ? "99+" : count}</span>}</span>;
}

export function UpdateToast({ notification, onOpen, onDismiss }) {
  if (!notification) return null;
  return <aside className="update-toast" aria-label="New updates"><div role="status" aria-live="polite"><strong>{notification.count === 1 ? "New update" : `${notification.count} new updates`}</strong><p>{notification.title}</p></div><button className="notification-open" onClick={onOpen}>View</button><button className="notification-dismiss" aria-label="Dismiss notification" onClick={onDismiss}>×</button></aside>;
}

export function UpdatesFeed({ notifications, onOpen }) {
  return <div className="updates-card">
    {notifications.error && <p role="status" className="notification-hint">{notifications.error}</p>}
    {notifications.loading ? <p className="notification-hint" role="status">Loading updates…</p> : !notifications.events.length ? <div className="app-empty"><h3>No updates yet</h3><p>Suggestions, votes, comments, expenses, and polls will appear here.</p></div> : notifications.events.map(entry => <button className="feed-row notification-feed-row" key={entry.id} onClick={() => onOpen(entry)}><span className="feed-icon">{entry.icon}</span><span className="notification-copy"><strong>{entry.title}</strong><span>{entry.text}</span><small>{entry.tripName} · {entry.date ? new Date(entry.date).toLocaleString([], {dateStyle:"medium",timeStyle:"short"}) : "Just now"}</small></span><span aria-hidden="true">›</span></button>)}
  </div>;
}
