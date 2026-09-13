export function mergeNotifications(previous, records, now = new Date().toISOString()) {
  const before = new Map((previous?.events || []).map(e => [e.id, e]));
  const added = [];
  const events = records.map(record => {
    const old = before.get(record.id);
    if (old?.version === record.version) return { ...record, date: old.date, read: old.read };
    const event = { ...record, date: old ? now : record.date || now, read: !previous };
    if (previous) added.push(event);
    return event;
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return { state: { events }, added };
}

export function markNotificationsRead(state, tripId) {
  return { events: state.events.map(e => !tripId || e.tripId === tripId ? { ...e, read: true } : e) };
}
