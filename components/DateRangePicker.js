"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function iso(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function parse(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return { y, m: m - 1, d };
}
function pretty(value) {
  const p = parse(value);
  if (!p) return "";
  return new Date(p.y, p.m, p.d).toLocaleDateString([], { month: "short", day: "numeric" });
}
function dayCount(start, end) {
  const a = parse(start); const b = parse(end);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)) / 86400000) + 1;
}

/**
 * One calendar, two taps: first tap picks the start, second tap picks the end.
 * Controlled by `start` / `end` (YYYY-MM-DD strings); calls onChange({ start, end }).
 */
export default function DateRangePicker({ start, end, onChange }) {
  const today = new Date();
  const first = parse(start) || { y: today.getFullYear(), m: today.getMonth() };
  const [view, setView] = useState({ y: first.y, m: first.m });
  const [waitingForEnd, setWaitingForEnd] = useState(Boolean(start) && !end);

  const cells = useMemo(() => {
    const offset = new Date(view.y, view.m, 1).getDay();
    const total = new Date(view.y, view.m + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }, [view]);

  function move(delta) {
    const next = new Date(view.y, view.m + delta, 1);
    setView({ y: next.getFullYear(), m: next.getMonth() });
  }

  function pick(day) {
    const value = iso(view.y, view.m, day);
    if (!waitingForEnd || !start || value < start) {
      onChange({ start: value, end: "" });
      setWaitingForEnd(true);
    } else {
      onChange({ start, end: value });
      setWaitingForEnd(false);
    }
  }

  const title = new Date(view.y, view.m, 1).toLocaleDateString([], { month: "long", year: "numeric" });
  const days = dayCount(start, end);
  const todayISO = iso(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="range-picker">
      <div className="range-summary" aria-live="polite">
        <span className={start ? "has-value" : ""}>{start ? pretty(start) : "Start"}</span>
        <i aria-hidden="true">→</i>
        <span className={end ? "has-value" : ""}>{end ? pretty(end) : (start ? "Pick end" : "End")}</span>
        {days > 0 && <em>{days} {days === 1 ? "day" : "days"}</em>}
      </div>
      <div className="range-head">
        <button type="button" onClick={() => move(-1)} aria-label="Previous month">‹</button>
        <strong>{title}</strong>
        <button type="button" onClick={() => move(1)} aria-label="Next month">›</button>
      </div>
      <div className="range-grid" role="grid" aria-label={title}>
        {WEEKDAYS.map((w, i) => <span className="range-dow" key={`${w}${i}`}>{w}</span>)}
        {cells.map((day, index) => {
          if (!day) return <span key={`b${index}`} />;
          const value = iso(view.y, view.m, day);
          const isStart = value === start;
          const isEnd = value === end;
          const inside = start && end && value > start && value < end;
          const band = start && end && start !== end && (isStart || isEnd || inside);
          return (
            <button
              type="button"
              key={value}
              className={`range-day${isStart ? " is-start" : ""}${isEnd ? " is-end" : ""}${inside ? " in-range" : ""}${band ? " has-band" : ""}${value === todayISO ? " is-today" : ""}`}
              aria-pressed={isStart || isEnd}
              aria-label={new Date(view.y, view.m, day).toDateString()}
              onClick={() => pick(day)}
            ><span>{day}</span></button>
          );
        })}
      </div>
    </div>
  );
}
