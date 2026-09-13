"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { mergeNotifications, markNotificationsRead } from "./notificationState.mjs";

const sources = ["trips", "activities", "votes", "comments", "extra_costs", "settlements", "group_polls", "group_poll_votes", "travelers"];
const fields = ["id,name", "id,trip_id,name,location,time_text,day_label,cost_pp,created_at", "id,activity_id,traveler_id,value,created_at", "id,activity_id,traveler_id,text,created_at", "id,trip_id,description,amount,currency,paid_by,created_at", "id,trip_id,amount,from_traveler,to_traveler,settled_at,created_at", "id,trip_id,question,options,created_at", "poll_id,user_id,option_index", "id,name,created_at"];

async function fetchRecords(signal) {
  // Row-level security limits every query to the signed-in member's groups.
  const results = await Promise.all(sources.map((table, index) => {
    let query = supabase.from(table).select(fields[index]);
    if (table !== "trips" && table !== "group_poll_votes") query = query.order("created_at", { ascending: false });
    return query.limit(table === "group_poll_votes" ? 1000 : 250).abortSignal(signal);
  }));
  if (results.some(r => r.error)) throw new Error("Couldn't refresh updates");
  const [trips, activities, votes, comments, costs, settlements, polls, pollVotes, travelers] = results.map(r => r.data || []);
  const names = new Map(travelers.map(t => [t.id, t.name]));
  const tripNames = new Map(trips.map(t => [t.id, t.name.replace(/^WAYFARE_GROUP::/, "")]));
  const activityMap = new Map(activities.map(a => [a.id, a]));
  const pollMap = new Map(polls.map(p => [p.id, p]));
  const records = [];
  function add(id, tripId, title, text, date, version, icon) {
    if (tripNames.has(tripId)) records.push({ id, tripId, tripName: tripNames.get(tripId), title, text, date, version: JSON.stringify(version), icon });
  }
  activities.forEach(a => add(`activity-${a.id}`, a.trip_id, a.name, "Activity suggestion", a.created_at, [a.name, a.location, a.time_text, a.day_label, a.cost_pp], "✦"));
  votes.forEach(v => { const a = activityMap.get(v.activity_id); if (a) add(`vote-${v.id}`, a.trip_id, a.name, `${names.get(v.traveler_id) || "Someone"} voted: ${{up:"I'm in",meh:"Maybe",down:"I'll pass"}[v.value] || v.value}`, v.created_at, v.value, "✓"); });
  comments.forEach(c => { const a = activityMap.get(c.activity_id); if (a) add(`comment-${c.id}`, a.trip_id, a.name, `${names.get(c.traveler_id) || "Someone"}: ${c.text}`, c.created_at, c.text, "“"); });
  costs.forEach(c => add(`cost-${c.id}`, c.trip_id, c.description, `${names.get(c.paid_by) || "Someone"} paid ${c.amount} ${c.currency || ""}`, c.created_at, [c.description,c.amount,c.currency,c.paid_by], "⇄"));
  settlements.forEach(s => add(`settlement-${s.id}`, s.trip_id, "Payment settled", `${names.get(s.from_traveler) || "Someone"} recorded a payment to ${names.get(s.to_traveler) || "a group member"}`, s.settled_at || s.created_at, [s.amount,s.from_traveler,s.to_traveler], "✓"));
  polls.forEach(p => add(`poll-${p.id}`, p.trip_id, p.question, "Group poll", p.created_at, [p.question,p.options], "☷"));
  pollVotes.forEach(v => { const p = pollMap.get(v.poll_id); if (p) add(`poll-vote-${v.poll_id}-${v.user_id}`, p.trip_id, p.question, `Poll vote: ${p.options[v.option_index - 1]}`, p.created_at, v.option_index, "✓"); });
  return records;
}

export function useUpdateNotifications(userId, updatesOpen, tripId) {
  const [state, setState] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const current = useRef(null);
  const view = useRef({ updatesOpen, tripId });
  view.current = { updatesOpen, tripId };
  const refreshRef = useRef(() => {});
  useEffect(() => {
    setState(null); setToast(null); setError(""); current.current = null;
    if (!userId) return;
    const key = `wayfare_notifications_v1_${userId}`;
    try { const stored = JSON.parse(localStorage.getItem(key)); if (Array.isArray(stored?.events)) current.current = stored; } catch {}
    setState(current.current);
    let disposed = false, busy = false, debounce;
    let controller;
    function persist(next) {
      current.current = next; setState(next);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Works in memory when storage is unavailable. */ }
    }
    async function refresh() {
      if (disposed || busy || document.visibilityState !== "visible") return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const records = await fetchRecords(controller.signal);
        if (disposed) return;
        const merged = mergeNotifications(current.current, records);
        const { updatesOpen: viewing, tripId: scope } = view.current;
        const next = viewing ? markNotificationsRead(merged.state, scope) : merged.state;
        persist(next); setError("");
        const incoming = merged.added.filter(e => !scope || e.tripId === scope);
        if (!viewing && incoming.length) setToast({ count: incoming.length, title: incoming[0].title });
      } catch { if (!disposed) setError("Updates couldn't refresh. Reconnecting…"); }
      finally { clearTimeout(timeout); busy = false; }
    }
    function readVisible() {
      if (document.visibilityState === "visible" && view.current.updatesOpen && current.current) {
        persist(markNotificationsRead(current.current, view.current.tripId)); setToast(null);
      }
    }
    function storage(event) {
      if (event.key !== key) return;
      try { const next = JSON.parse(event.newValue); if (Array.isArray(next?.events)) { current.current = next; setState(next); } } catch {}
    }
    function schedule() { clearTimeout(debounce); debounce = setTimeout(refresh, 600); }
    const channel = supabase.channel(`update-notifications-${userId}-${tripId || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public" }, payload => { if (sources.includes(payload.table)) schedule(); }).subscribe();
    const interval = setInterval(refresh, 30000);
    const focus = () => { readVisible(); refresh(); };
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("focus", focus);
    window.addEventListener("storage", storage);
    refreshRef.current = readVisible;
    refresh();
    return () => { disposed = true; controller?.abort(); clearTimeout(debounce); clearInterval(interval); document.removeEventListener("visibilitychange", focus); window.removeEventListener("focus", focus); window.removeEventListener("storage", storage); supabase.removeChannel(channel); refreshRef.current = () => {}; };
  }, [userId, tripId]);
  useEffect(() => { refreshRef.current(); }, [updatesOpen, tripId]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 7000); return () => clearTimeout(timer); }, [toast]);
  const events = (state?.events || []).filter(e => !tripId || e.tripId === tripId);
  return { events, unread: events.filter(e => !e.read).length, toast, dismiss: () => setToast(null), loading: !state && Boolean(userId), error };
}
