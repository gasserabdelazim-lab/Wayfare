"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

const icons = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/></svg>',
    coin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 15c0 1 1 1.8 2.5 1.8s2.5-.7 2.5-1.6c0-2.3-5-1.1-5-3.4 0-.9 1-1.6 2.5-1.6s2.5.6 2.5 1.5"/><line x1="12" y1="8" x2="12" y2="16.2"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3.5" y="5" width="17" height="15" rx="2"/><line x1="3.5" y1="9.5" x2="20.5" y2="9.5"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3zm0 0 5-7a2 2 0 0 1 3.6 1.7L14.5 9H19a2 2 0 0 1 2 2.3l-1.4 8A3 3 0 0 1 16.6 22H10a3 3 0 0 1-3-3"/></svg>',
    meh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="8" y1="15" x2="16" y2="15"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 14V3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-3zm0 0-5 7a2 2 0 0 1-3.6-1.7L9.5 15H5a2 2 0 0 1-2-2.3l1.4-8A3 3 0 0 1 7.4 2H14a3 3 0 0 1 3 3"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="12" x2="18" y2="12"/><polyline points="13 7 18 12 13 17"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/></svg>',
};

function Icon({ name, style }) {
    return <span style={style} dangerouslySetInnerHTML={{ __html: icons[name] }} />;
}

const AVATAR_COLORS = ["#1f6f63", "#d0603f", "#b98a2e", "#5b6fa8", "#8a5b96", "#4a8f6b", "#a8544b"];
function avatarColor(name) {
    let h = 0;
    for (let i = 0; i < (name || "").length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name) {
    return (name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("");
}
function Avatar({ name, size = 26 }) {
    return (
          <span
        className="avatar"
        style={{ width: size, height: size, fontSize: size * 0.42, background: avatarColor(name) }}
      title={name}
    >
      {initials(name)}
        </span>
  );
}

const SUGGESTIONS = [
  { name: "Breakfast spot", cat: "food" },
  { name: "Museum or gallery", cat: "sight" },
  { name: "Local market", cat: "sight" },
  { name: "Sunset viewpoint", cat: "sight" },
  { name: "Group dinner", cat: "food" },
  { name: "Walking tour", cat: "sight" },
  { name: "Beach / swim time", cat: "chill" },
  { name: "Bar / nightlife", cat: "chill" },
  { name: "Free morning — sleep in", cat: "chill" },
  { name: "Day trip out of town", cat: "sight" },
  ];

function fmtDay(dateStr, fallbackLabel) {
    if (!dateStr) return fallbackLabel;
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d)) return fallbackLabel;
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
    const md = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${weekday} · ${md}`;
}

function downloadIcs(activity) {
    const dateStr = activity.day_date;
    if (!dateStr) return;
    let h = 9, m = 0;
    const match = (activity.time_text || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
          h = parseInt(match[1]);
          m = parseInt(match[2]);
          const ampm = (match[3] || "").toUpperCase();
          if (ampm === "PM" && h < 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
    }
    const start = new Date(dateStr + "T00:00:00");
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 90 * 60000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
          "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wayfare//Trip//EN", "BEGIN:VEVENT",
          "UID:" + activity.id + "@wayfare",
          "DTSTAMP:" + fmt(start),
          "DTSTART:" + fmt(start),
          "DTEND:" + fmt(end),
          "SUMMARY:" + activity.name,
          "LOCATION:" + (activity.location || ""),
          "END:VEVENT", "END:VCALENDAR"
        ].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activity.name.replace(/[^a-z0-9]/gi, "_") + ".ics";
    a.click();
    URL.revokeObjectURL(url);
}

export default function TripPage() {
    const { id: tripId } = useParams();
    const [trip, setTrip] = useState(null);
    const [travelers, setTravelers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [votesByActivity, setVotesByActivity] = useState({});
    const [commentsByActivity, setCommentsByActivity] = useState({});
    const [extraCosts, setExtraCosts] = useState([]);
    const [me, setMe] = useState(null);
    const [nameInput, setNameInput] = useState("");
    const [newActivity, setNewActivity] = useState({ day_label: "", day_date: "", name: "" });
    const [costForm, setCostForm] = useState({ desc: "", amt: "", paidBy: "" });
    const [addOpen, setAddOpen] = useState(false);
    const [justAddedId, setJustAddedId] = useState(null);
    const itemRefs = useRef({});
    const addFormRef = useRef(null);

  const load = useCallback(async () => {
        const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).single();
        setTrip(tripData);

                               const { data: travelerData } = await supabase.from("travelers").select("*").eq("trip_id", tripId);
        setTravelers(travelerData || []);

                               const { data: activityData } = await supabase
          .from("activities").select("*").eq("trip_id", tripId).order("sort_order");
        setActivities(activityData || []);

                               const activityIds = (activityData || []).map((a) => a.id);
        if (activityIds.length) {
                const { data: voteData } = await supabase.from("votes").select("*").in("activity_id", activityIds);
                const vMap = {};
                (voteData || []).forEach((v) => {
                          vMap[v.activity_id] = vMap[v.activity_id] || [];
                          vMap[v.activity_id].push(v);
                });
                setVotesByActivity(vMap);

          const { data: commentData } = await supabase.from("comments").select("*, travelers(name)").in("activity_id", activityIds);
                const cMap = {};
                (commentData || []).forEach((c) => {
                          cMap[c.activity_id] = cMap[c.activity_id] || [];
                          cMap[c.activity_id].push(c);
                });
                setCommentsByActivity(cMap);
        } else {
                setVotesByActivity({});
                setCommentsByActivity({});
        }

                               const { data: costData } = await supabase.from("extra_costs").select("*, travelers(name)").eq("trip_id", tripId);
        setExtraCosts(costData || []);
  }, [tripId]);

  useEffect(() => {
        load();
        const savedName = localStorage.getItem(`wayfare_name_${tripId}`);
        if (savedName) setMe(savedName);

                const channel = supabase
          .channel(`trip-${tripId}`)
          .on("postgres_changes", { event: "*", schema: "public" }, () => load())
          .subscribe();
        return () => supabase.removeChannel(channel);
  }, [tripId, load]);

  useEffect(() => {
        if (justAddedId && itemRefs.current[justAddedId]) {
                itemRefs.current[justAddedId].scrollIntoView({ behavior: "smooth", block: "center" });
                const t = setTimeout(() => setJustAddedId(null), 2200);
                return () => clearTimeout(t);
        }
  }, [justAddedId, activities]);

  async function joinAsTraveler(chosenName) {
        const finalName = (chosenName ?? nameInput).trim();
        if (!finalName) return;
        const existing = travelers.find((t) => t.name.toLowerCase() === finalName.toLowerCase());
        if (!existing) {
                await supabase.from("travelers").insert({ trip_id: tripId, name: finalName });
        }
        localStorage.setItem(`wayfare_name_${tripId}`, finalName);
        setMe(finalName);
        load();
  }

  function myTraveler() {
        return travelers.find((t) => t.name.toLowerCase() === (me || "").toLowerCase());
  }

  async function castVote(activityId, value) {
        const traveler = myTraveler();
        if (!traveler) return;
        const existing = (votesByActivity[activityId] || []).find((v) => v.traveler_id === traveler.id);
        if (existing && existing.value === value) {
                await supabase.from("votes").delete().eq("id", existing.id);
        } else if (existing) {
                await supabase.from("votes").update({ value }).eq("id", existing.id);
        } else {
                await supabase.from("votes").insert({ activity_id: activityId, traveler_id: traveler.id, value });
        }
  }

  async function addComment(activityId, text) {
        const traveler = myTraveler();
        if (!traveler || !text.trim()) return;
        await supabase.from("comments").insert({ activity_id: activityId, traveler_id: traveler.id, text: text.trim() });
  }

  async function updateActivity(id, fields) {
        await supabase.from("activities").update(fields).eq("id", id);
  }

  async function deleteActivity(id) {
        if (!confirm("Remove this activity for everyone?")) return;
        await supabase.from("activities").delete().eq("id", id);
  }

  async function deleteExtraCost(id) {
        if (!confirm("Remove this cost?")) return;
        await supabase.from("extra_costs").delete().eq("id", id);
  }

  async function addActivity(prefillName) {
        const label = newActivity.day_label.trim() || "Unscheduled";
        const activityName = (prefillName ?? newActivity.name).trim();
        if (!activityName) return;
        const { data } = await supabase
          .from("activities")
          .insert({
                    trip_id: tripId,
                    day_label: label,
                    day_date: newActivity.day_date || null,
                    name: activityName,
                    sort_order: activities.length,
          })
          .select()
          .single();
        setNewActivity({ day_label: newActivity.day_label, day_date: newActivity.day_date, name: "" });
        if (data) setJustAddedId(data.id);
  }

  async function addExtraCost() {
        const val = parseFloat((costForm.amt || "").replace(/[^0-9.]/g, ""));
        if (!costForm.desc.trim() || !(val > 0) || !costForm.paidBy) return;
        await supabase.from("extra_costs").insert({
                trip_id: tripId, description: costForm.desc.trim(), amount: val, paid_by: costForm.paidBy
        });
        setCostForm({ desc: "", amt: "", paidBy: "" });
  }

  function statusOf(activityId) {
        const votes = votesByActivity[activityId] || [];
        const up = votes.filter((v) => v.value === "up").length;
        const down = votes.filter((v) => v.value === "down").length;
        if (votes.length === 0) return "waiting";
        if (down > 0 && down >= up) return "contested";
        return "agreed";
  }

  const grouped = useMemo(() => {
        const g = activities.reduce((acc, a) => {
                const key = a.day_label || "Unscheduled";
                acc[key] = acc[key] || { date: a.day_date, items: [] };
                acc[key].items.push(a);
                if (a.day_date && (!acc[key].date || a.day_date < acc[key].date)) acc[key].date = a.day_date;
                return acc;
        }, {});
        return Object.entries(g).sort((a, b) => {
                if (a[1].date && b[1].date) return a[1].date.localeCompare(b[1].date);
                if (a[1].date) return -1;
                if (b[1].date) return 1;
                return a[0].localeCompare(b[0]);
        });
  }, [activities]);

  const counts = { agreed: 0, contested: 0, waiting: 0 };
    activities.forEach((a) => counts[statusOf(a.id)]++);

  const topActivityIdPerDay = useMemo(() => {
        const map = {};
        grouped.forEach(([label, group]) => {
                let best = null, bestScore = -Infinity;
                group.items.forEach((a) => {
                          const votes = votesByActivity[a.id] || [];
                          const score = votes.filter((v) => v.value === "up").length - votes.filter((v) => v.value === "down").length;
                          if (votes.length > 0 && score > bestScore) { bestScore = score; best = a.id; }
                });
                if (best) map[label] = best;
        });
        return map;
  }, [grouped, votesByActivity]);

  const itemsTotal = activities.reduce((sum, a) => sum + (a.cost_pp || 0) * travelers.length, 0);
    const extrasTotal = extraCosts.reduce((sum, c) => sum + Number(c.amount), 0);
    const total = itemsTotal + extrasTotal;
    const share = travelers.length ? total / travelers.length : 0;

  const paid = {};
    travelers.forEach((t) => (paid[t.id] = 0));
    activities.forEach((a) => {
          if (a.cost_pp > 0 && a.paid_by) paid[a.paid_by] = (paid[a.paid_by] || 0) + a.cost_pp * travelers.length;
    });
    extraCosts.forEach((c) => {
          if (c.paid_by) paid[c.paid_by] = (paid[c.paid_by] || 0) + Number(c.amount);
    });
    const balances = travelers.map((t) => ({ id: t.id, name: t.name, net: Math.round(((paid[t.id] || 0) - share) * 100) / 100 }));
    const debtors = balances.filter((b) => b.net < -0.5).map((b) => ({ ...b, amt: -b.net })).sort((a, b) => b.amt - a.amt);
    const creditors = balances.filter((b) => b.net > 0.5).map((b) => ({ ...b, amt: b.net })).sort((a, b) => b.amt - a.amt);
    const transfers = [];
  {
        let di = 0, ci = 0;
        const dcopy = debtors.map((d) => ({ ...d }));
        const ccopy = creditors.map((c) => ({ ...c }));
        while (di < dcopy.length && ci < ccopy.length) {
                const amt = Math.min(dcopy[di].amt, ccopy[ci].amt);
                transfers.push({ from: dcopy[di].name, to: ccopy[ci].name, amt: Math.round(amt) });
                dcopy[di].amt -= amt; ccopy[ci].amt -= amt;
                if (dcopy[di].amt < 0.5) di++;
                if (ccopy[ci].amt < 0.5) ci++;
        }
  }

  const myBalance = balances.find((b) => b.id === myTraveler()?.id);

  if (!trip) return <div className="wrap"><div className="loading-state">Loading your trip…</div></div>;

  if (!me) {
        return (
                <div className="wrap name-gate">
                  <div className="eyebrow">{trip.name}</div>
            <h1 style={{ fontSize: 26, marginTop: 10 }}>What's your name?</h1>
            <p style={{ opacity: 0.6, fontSize: 13, marginTop: 6 }}>So the group knows whose votes are whose.</p>
        <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your name" onKeyDown={(e) => e.key === "Enter" && joinAsTraveler()} autoFocus />
          <button onClick={() => joinAsTraveler()}>Join trip</button>
{travelers.length > 0 && (
            <div className="existing-travelers">
              <div className="field-label" style={{ textAlign: "center" }}>Already on this trip</div>
            <div className="traveler-chips">
{travelers.map((t) => (
                  <button key={t.id} className="traveler-chip" onClick={() => joinAsTraveler(t.name)}>
                  <Avatar name={t.name} size={20} /> {t.name}
</button>
              ))}
                </div>
                </div>
        )}
</div>
    );
}

  const usedNames = new Set(activities.map((a) => a.name.toLowerCase()));
  const suggestionsToShow = SUGGESTIONS.filter((s) => !usedNames.has(s.name.toLowerCase())).slice(0, 6);

  return (
        <div className="wrap">
          <div className="pass">
            <div className="pass-top">
              <div>
                <div className="eyebrow">Boarding · Group trip</div>
            <h1>{trip.name}</h1>
            <div className="pass-dates">
                  <span className="traveler-stack">
  {travelers.slice(0, 5).map((t) => <Avatar key={t.id} name={t.name} size={22} />)}
                             </span>
                             {travelers.length} traveler{travelers.length === 1 ? "" : "s"} · you're {me}
    </div>
    </div>
          <button className="share-btn" onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copied — send it to the group."); }}>
            <Icon name="pin" style={{ width: 14, height: 14 }} />Share
    </button>
    </div>
        <div className="stub">
              <div><div className="lab">Agreed</div><div className="val val-agreed">{counts.agreed}</div></div>
          <div><div className="lab">Contested</div><div className="val val-contested">{counts.contested}</div></div>
          <div><div className="lab">Waiting</div><div className="val val-waiting">{counts.waiting}</div></div>
    </div>
    </div>

{activities.length === 0 && (
          <div className="empty-state">
            <Icon name="sparkle" style={{ width: 22, height: 22, opacity: 0.5 }} />
          <div className="empty-title">No activities yet</div>
          <div className="empty-sub">Add the first idea below, or try a quick suggestion.</div>
          <div className="suggestion-row">
{SUGGESTIONS.slice(0, 5).map((s) => (
                <button key={s.name} className="suggestion-chip" onClick={() => addActivity(s.name)}>
                <Icon name="plus" style={{ width: 11, height: 11 }} />{s.name}
  </button>
            ))}
              </div>
              </div>
      )}

{grouped.map(([dayLabel, group]) => {
          const items = group.items;
          const topId = topActivityIdPerDay[dayLabel];
          return (
                      <div key={dayLabel}>
                        <div className="day-label-row">
                          <span className="day-label">{dayLabel}</span>
  {group.date && <span className="day-date">{fmtDay(group.date, "")}</span>}
             </div>
             {items.map((a) => {
                const votes = votesByActivity[a.id] || [];
                const myVote = votes.find((v) => v.traveler_id === myTraveler()?.id)?.value;
                const up = votes.filter((v) => v.value === "up").length;
                const meh = votes.filter((v) => v.value === "meh").length;
                const down = votes.filter((v) => v.value === "down").length;
                const status = statusOf(a.id);
                const comments = commentsByActivity[a.id] || [];
                const isTop = a.id === topId && up > 0;
                const isJustAdded = a.id === justAddedId;
                return (
                                  <div
                    className={`item${isJustAdded ? " item-flash" : ""}`}
                                          key={a.id}
                                ref={(el) => (itemRefs.current[a.id] = el)}
                              >
                                                    <div className="item-top">
                                                      <span className="item-name">
                                {isTop && <span className="top-pick" title="Group favorite"><Icon name="star" style={{ width: 12, height: 12 }} /></span>}
{a.name}
</span>
                    <div className="item-top-right">
                        <span className={`item-badge b-${status}`}>{status[0].toUpperCase() + status.slice(1)}</span>
                      <button className="icon-btn" title="Remove activity" onClick={() => deleteActivity(a.id)}>
                        <Icon name="trash" style={{ width: 13, height: 13 }} />
  </button>
  </div>
  </div>
                  <div className="item-meta">
                      <span><Icon name="pin" /><span contentEditable suppressContentEditableWarning onBlur={(e) => updateActivity(a.id, { location: e.target.textContent.trim() })}>{a.location || "Add location"}</span></span>
                      <span><Icon name="coin" /><span contentEditable suppressContentEditableWarning onBlur={(e) => { const v = parseFloat(e.target.textContent.replace(/[^0-9.]/g, "")); updateActivity(a.id, { cost_pp: v > 0 ? v : 0 }); }}>{a.cost_pp ? `€${a.cost_pp} pp` : "Add cost"}</span></span>
                      <span><Icon name="clock" /><span contentEditable suppressContentEditableWarning onBlur={(e) => updateActivity(a.id, { time_text: e.target.textContent.trim() })}>{a.time_text || "Add time"}</span></span>
{a.cost_pp > 0 && (
                        <select className="paid-select" value={a.paid_by || ""} onChange={(e) => updateActivity(a.id, { paid_by: e.target.value || null })}>
                        <option value="">who paid?</option>
{travelers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
  </select>
                    )}
</div>
                  <div className="vote-row">
                                          <button className={`vbtn ${myVote === "up" ? "active-up" : ""}`} onClick={() => castVote(a.id, "up")}><Icon name="up" />Good{up > 0 ? ` (${up})` : ""}</button>
                    <button className={`vbtn ${myVote === "meh" ? "active-meh" : ""}`} onClick={() => castVote(a.id, "meh")}><Icon name="meh" />Meh{meh > 0 ? ` (${meh})` : ""}</button>
                    <button className={`vbtn ${myVote === "down" ? "active-down" : ""}`} onClick={() => castVote(a.id, "down")}><Icon name="down" />Skip{down > 0 ? ` (${down})` : ""}</button>
                      </div>
{votes.length > 0 && (
                      <div className="voter-avatars">
{votes.map((v) => {
                          const t = travelers.find((tr) => tr.id === v.traveler_id);
                          if (!t) return null;
                          return <span key={v.id} className={`voter-dot vd-${v.value}`}><Avatar name={t.name} size={18} /></span>;
})}
  </div>
                  )}
{comments.length > 0 && (
                      <div className="comment-list">
{comments.map((c) => <div className="comment" key={c.id}><b>{c.travelers?.name || "Someone"}:</b> {c.text}</div>)}
  </div>
                  )}
                  <input className="comment-input" placeholder="Add a comment (optional)" onKeyDown={(e) => { if (e.key === "Enter" && e.target.value.trim()) { addComment(a.id, e.target.value); e.target.value = ""; } }} />
                  <div className="item-actions">
                                        <button className="cal-btn" onClick={() => downloadIcs(a)}><Icon name="cal" />Add to calendar</button>
                    </div>
                  <div className="booking">
                                        <input placeholder="Booking link or confirmation #" defaultValue={a.booking_info || ""} onBlur={(e) => updateActivity(a.id, { booking_info: e.target.value })} />
                    </div>
                    </div>
              );
})}
</div>
        );
})}

{activities.length > 0 && suggestionsToShow.length > 0 && (
          <div className="suggestion-block">
            <div className="field-label" style={{ marginBottom: 8 }}>Need ideas? Quick-add a suggestion</div>
          <div className="suggestion-row">
{suggestionsToShow.map((s) => (
                <button key={s.name} className="suggestion-chip" onClick={() => addActivity(s.name)}>
                <Icon name="plus" style={{ width: 11, height: 11 }} />{s.name}
  </button>
            ))}
              </div>
              </div>
      )}

      <div className="sec-head"><h2>Add an activity</h2></div>
              <div className="home-card" ref={addFormRef}>
                <label className="field-label">Day</label>
        <input placeholder="e.g. Day 3 · Barcelona" value={newActivity.day_label} onChange={(e) => setNewActivity({ ...newActivity, day_label: e.target.value })} />
                <label className="field-label">Date (optional, keeps days in order)</label>
        <input type="date" value={newActivity.day_date} onChange={(e) => setNewActivity({ ...newActivity, day_date: e.target.value })} />
                <label className="field-label">Activity</label>
        <input placeholder="e.g. Sagrada Família tour" value={newActivity.name} onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addActivity()} />
        <button onClick={() => addActivity()}><Icon name="plus" style={{ width: 13, height: 13, marginRight: 6 }} />Add activity</button>
        </div>

      <div className="sec-head"><h2>Costs so far</h2></div>
              <div className="cost-card">
                <div className="cost-total">
                  <div><div className="num">€{Math.round(total).toLocaleString()}</div><div className="lab">total, all items + extras</div></div>
          <div style={{ textAlign: "right" }}><div className="num">€{Math.round(share).toLocaleString()}</div><div className="lab">per traveler</div></div>
        </div>
        <div className="cost-sub">€{Math.round(itemsTotal).toLocaleString()} from activities · €{Math.round(extrasTotal).toLocaleString()} in extras</div>
{activities.filter((a) => a.cost_pp > 0).map((a) => {
            const payer = travelers.find((t) => t.id === a.paid_by);
            return (
                          <div className="ledger-row" key={a.id}>
                            <span className="ledger-name">
            {a.name} <span className="ledger-sub">— €{a.cost_pp} pp{payer ? ` · paid by ${payer.name}` : ""}</span>
  </span>
               <span className="ledger-amt">€{Math.round(a.cost_pp * travelers.length)}</span>
  </div>
           );
})}
{extraCosts.map((c) => (
            <div className="ledger-row" key={c.id}>
            <span className="ledger-name">
{c.description} <span className="ledger-sub">{c.travelers?.name ? `— paid by ${c.travelers.name}` : ""}</span>
  </span>
            <span className="ledger-row-right">
                <span className="ledger-amt">€{Math.round(c.amount)}</span>
              <button className="icon-btn" title="Remove cost" onClick={() => deleteExtraCost(c.id)}><Icon name="trash" style={{ width: 12, height: 12 }} /></button>
  </span>
  </div>
        ))}
{activities.filter((a) => a.cost_pp > 0).length === 0 && extraCosts.length === 0 && (
            <div className="ledger-empty">No costs logged yet — add one below, or set a cost on an activity above.</div>
         )}
        <div className="add-cost">
                    <input placeholder="What was it for?" value={costForm.desc} onChange={(e) => setCostForm({ ...costForm, desc: e.target.value })} />
                    <input placeholder="€ amount" value={costForm.amt} onChange={(e) => setCostForm({ ...costForm, amt: e.target.value })} />
                    <select className="paid-select" style={{ borderRadius: 8, padding: "0 8px" }} value={costForm.paidBy} onChange={(e) => setCostForm({ ...costForm, paidBy: e.target.value })}>
                      <option value="">who paid?</option>
{travelers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
  </select>
          <button onClick={addExtraCost}>Add</button>
  </div>
  </div>

      <div className="sec-head"><h2>Settle up</h2></div>
        <div className="settle-card">
{myBalance && (
            <div className={`settle-headline ${myBalance.net > 0.5 ? "sh-pos" : myBalance.net < -0.5 ? "sh-neg" : "sh-zero"}`}>
{myBalance.net > 0.5 && <>You're owed <b>€{myBalance.net.toFixed(0)}</b> overall</>}
{myBalance.net < -0.5 && <>You owe <b>€{Math.abs(myBalance.net).toFixed(0)}</b> overall</>}
 {myBalance.net >= -0.5 && myBalance.net <= 0.5 && <>You're all settled up</>}
   </div>
          )}
 {balances.map((b) => (
             <div className="balance-row" key={b.id}>
               <span className="ledger-name balance-name"><Avatar name={b.name} size={22} />{b.name}</span>
            <span className={b.net > 0.5 ? "balance-pos" : b.net < -0.5 ? "balance-neg" : "balance-zero"}>
{b.net > 0.5 ? `gets back €${b.net.toFixed(0)}` : b.net < -0.5 ? `owes €${Math.abs(b.net).toFixed(0)}` : "settled"}
</span>
  </div>
        ))}
        <div className="settle-divider">Who pays whom <span className="simplified-badge">simplified</span></div>
        {transfers.length === 0 ? (
                    <div className="ledger-empty">Everyone's square.</div>
                  ) : transfers.map((t, i) => (
                    <div className="transfer-row" key={i}>
                      <Avatar name={t.from} size={24} /><span>{t.from}</span>
            <Icon name="arrow" />
                      <Avatar name={t.to} size={24} /><span>{t.to}</span>
            <span className="transfer-amt">€{t.amt}</span>
          </div>
        ))}
</div>

      <div className="footnote">Wayfare — everyone with this link sees live updates. No accounts, just names.</div>

      <button className="fab" title="Add activity" onClick={() => { setAddOpen(true); addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
        <Icon name="plus" style={{ width: 22, height: 22 }} />
          </button>
          </div>
  );
}
