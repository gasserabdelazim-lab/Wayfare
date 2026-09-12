"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function QuestionPolls({ tripId, userId }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState("");
  const lock = useRef(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("group_polls").select("*, group_poll_votes(user_id, option_index)").eq("trip_id", tripId).order("created_at", { ascending: false });
    if (error) { setError("Group questions couldn't load. Please retry."); }
    else { setPolls(data || []); setError(""); }
    setLoading(false);
  }, [tripId]);
  useEffect(() => {
    load();
    const refresh = () => { if (document.visibilityState === "visible" && !lock.current) load(); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [load]);
  async function save(action, task) {
    if (lock.current) return;
    lock.current = true; setBusy(action); setError("");
    try { await task(); await load(); }
    catch (e) { setError(e.message || "Couldn't save. Please try again."); }
    finally { lock.current = false; setBusy(""); }
  }
  function create(event) {
    event.preventDefault();
    save("create", async () => {
      const values = options.map(v => v.trim());
      if (new Set(values.map(v => v.toLowerCase())).size !== values.length) throw new Error("Each option needs to be different.");
      const { error } = await supabase.rpc("create_group_poll", { target_trip: tripId, poll_question: question.trim(), poll_options: values });
      if (error) throw new Error(error.message);
      setOpen(false); setQuestion(""); setOptions(["", ""]);
    });
  }
  return <section className="question-polls" aria-label="Group questions">
    <div className="group-section-heading"><div><span className="eyebrow">Dates, places, anything</span><h3>Ask the group</h3></div><button className="poll-create-button" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Cancel" : "+ New poll"}</button></div>
    {open && <form className="poll-card question-composer" onSubmit={create}>
      <label className="field-label" htmlFor="poll-question">Your question</label><input id="poll-question" required maxLength={200} value={question} onChange={e => setQuestion(e.target.value)} placeholder="Where should we go?" />
      {options.map((value, index) => <label className="question-option-field" key={index}><span>Option {index + 1}</span><input required maxLength={120} value={value} onChange={e => setOptions(options.map((v, i) => i === index ? e.target.value : v))} placeholder={index === 0 ? "Barcelona" : index === 1 ? "Lisbon" : "Another option"} /></label>)}
      <div className="question-form-actions">{options.length < 8 && <button type="button" onClick={() => setOptions([...options, ""])}>+ Add option</button>}{options.length > 2 && <button type="button" onClick={() => setOptions(options.slice(0, -1))}>Remove last option</button>}</div>
      <button className="poll-add" disabled={Boolean(busy) || !userId}>{busy === "create" ? "Posting…" : "Post poll"}</button>
    </form>}
    {error && <div role="alert" className="poll-error">{error} <button onClick={load}>Retry</button></div>}
    {loading ? <p role="status">Loading questions…</p> : !polls.length && !open && !error && <p className="group-hint">Pick your dates, choose a destination, or settle the dinner debate.</p>}
    {polls.map(poll => {
      const votes = poll.group_poll_votes || [];
      const mine = votes.find(v => v.user_id === userId)?.option_index;
      return <article className="poll-card" key={poll.id} aria-label={`Group question: ${poll.question}`}><div className="poll-card-top"><span>Group question</span><span>{mine ? "You voted ✓" : "Have your say"}</span></div><h4>{poll.question}</h4>
        <div className="poll-options">{poll.options.map((option, i) => {
          const count = votes.filter(v => v.option_index === i + 1).length;
          const percent = votes.length ? Math.round(count / votes.length * 100) : 0;
          return <button className="poll-option" key={i} aria-pressed={mine === i + 1} disabled={Boolean(busy) || !userId} onClick={() => save(poll.id, async () => {
            const { error } = await supabase.rpc("vote_group_poll", { target_poll: poll.id, selected_option: mine === i + 1 ? null : i + 1 });
            if (error) throw new Error("Your vote couldn't be saved. Please try again.");
          })}><span className="poll-fill" style={{ width: `${percent}%` }} aria-hidden="true" /><span className="poll-option-label">{mine === i + 1 ? "✓ " : ""}{option}</span><span className="poll-option-count">{count} · {percent}%</span></button>;
        })}</div><small className="group-hint" aria-live="polite">{busy === poll.id ? "Saving…" : `${votes.length} vote${votes.length === 1 ? "" : "s"} · Pick one. Change anytime.`}</small></article>;
    })}
  </section>;
}
