"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const EMPTY = {
  rsvps: [], flights: [], lodging: [], places: [], events: [],
  tasks: [], checklists: [], items: [], posts: [], reactions: [],
};

const TABLES = {
  rsvps: "trip_rsvps",
  flights: "trip_flights",
  lodging: "trip_lodging",
  places: "trip_places",
  events: "trip_events",
  tasks: "trip_tasks",
  checklists: "trip_checklists",
  items: "trip_checklist_items",
  posts: "trip_posts",
  reactions: "trip_post_reactions",
};

function missingTable(error) {
  if (!error) return false;
  const text = `${error.code || ""} ${error.message || ""}`;
  return /42P01|PGRST205|does not exist|schema cache|Could not find the table/i.test(text);
}

/**
 * Loads and mutates the trip features that live in the trip_* tables
 * (RSVPs, flights, lodging, places, events, tasks, checklists, wall).
 * `available` is false until the migration has been applied, so the UI can
 * explain instead of failing.
 */
export function useTripFeatures(tripId, userId) {
  const [data, setData] = useState(EMPTY);
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    if (!tripId || !userId) return;
    const entries = Object.entries(TABLES);
    const orderFor = (key) => (key === "posts" ? { column: "created_at", ascending: false } : key === "flights" ? { column: "departs_at", ascending: true } : { column: "created_at", ascending: true });
    const results = await Promise.all(entries.map(async ([key, table]) => {
      let query = supabase.from(table).select("*").eq("trip_id", tripId);
      if (key !== "rsvps" && key !== "reactions") {
        const order = orderFor(key);
        query = query.order(order.column, { ascending: order.ascending });
      }
      const { data: rows, error: queryError } = await query;
      return [key, rows || [], queryError];
    }));
    if (results.some(([, , queryError]) => missingTable(queryError))) {
      setAvailable(false);
      setLoaded(true);
      return;
    }
    const next = { ...EMPTY };
    results.forEach(([key, rows]) => { next[key] = rows; });
    setData(next);
    setAvailable(true);
    setLoaded(true);
  }, [tripId, userId]);

  useEffect(() => {
    load();
    const refresh = () => { if (document.visibilityState === "visible" && !busyRef.current) load(); };
    const timer = setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [load]);

  async function run(task) {
    busyRef.current = true;
    setError("");
    try {
      const result = await task();
      if (result?.error) {
        setError(missingTable(result.error) ? "This feature needs a one-time database update." : result.error.message || "Couldn't save. Please try again.");
        return false;
      }
      await load();
      return true;
    } catch (caught) {
      setError(caught.message || "Couldn't save. Please try again.");
      return false;
    } finally {
      busyRef.current = false;
    }
  }

  const add = (key, row) => run(() => supabase.from(TABLES[key]).insert({ trip_id: tripId, ...row }));
  const patch = (key, id, values) => run(() => supabase.from(TABLES[key]).update(values).eq("id", id));
  const remove = (key, id) => run(() => supabase.from(TABLES[key]).delete().eq("id", id));

  const setRsvp = (status) => run(() => supabase.from(TABLES.rsvps).upsert(
    { trip_id: tripId, user_id: userId, status, updated_at: new Date().toISOString() },
    { onConflict: "trip_id,user_id" },
  ));

  const toggleReaction = (postId, mine) => run(() => (mine
    ? supabase.from(TABLES.reactions).delete().eq("post_id", postId).eq("user_id", userId)
    : supabase.from(TABLES.reactions).insert({ post_id: postId, trip_id: tripId, user_id: userId })));

  return { ...data, available, loaded, error, setError, reload: load, add, patch, remove, setRsvp, toggleReaction };
}
