"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const TOUR_EVENT = "palvoya-start-tour";

function readSeen(key) {
  try { return window.localStorage.getItem(key) === "1"; } catch { return false; }
}
function writeSeen(key) {
  try { window.localStorage.setItem(key, "1"); } catch { /* storage unavailable */ }
}

/**
 * Spotlight tour. steps: [{ target?: cssSelector, enter?: cssSelector-to-click,
 * title, body }]. A step without a target shows a centred card.
 * `ready` delays the auto-start until the page content has loaded.
 */
export default function GuidedTour({ steps, storageKey, ready = true, tourId }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [cardHeight, setCardHeight] = useState(240);
  const cardRef = useRef(null);
  const step = steps[index];

  // Auto-start the first time this tour is available.
  useEffect(() => {
    if (!ready || open || readSeen(storageKey)) return undefined;
    const timer = setTimeout(() => { setIndex(0); setOpen(true); }, 1100);
    return () => clearTimeout(timer);
  }, [ready, open, storageKey]);

  // Manual restart (Profile -> Replay tour).
  useEffect(() => {
    function start(event) {
      if (event.detail && event.detail !== tourId) return;
      setIndex(0);
      setOpen(true);
    }
    window.addEventListener(TOUR_EVENT, start);
    return () => window.removeEventListener(TOUR_EVENT, start);
  }, [tourId]);

  const measure = useCallback(() => {
    if (!step?.target) { setRect(null); return; }
    const el = document.querySelector(step.target);
    if (!el) { setRect(null); return; }
    const box = el.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) { setRect(null); return; }
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [step]);

  // Enter a step: optionally click a nav button, scroll the target into view, measure.
  useEffect(() => {
    if (!open || !step) return undefined;
    let cancelled = false;
    if (step.enter) {
      const trigger = document.querySelector(step.enter);
      if (trigger) trigger.click();
    }
    const timers = [];
    timers.push(setTimeout(() => {
      if (cancelled) return;
      const el = step.target ? document.querySelector(step.target) : null;
      if (el) {
        const box = el.getBoundingClientRect();
        const fixed = getComputedStyle(el).position === "fixed" || el.closest(".mobile-bottom-nav");
        if (!fixed && (box.top < 90 || box.bottom > window.innerHeight - 120)) {
          el.scrollIntoView({ block: "center", behavior: "auto" });
        }
      }
      measure();
    }, step.enter ? 380 : 120));
    timers.push(setTimeout(measure, step.enter ? 800 : 450));
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [open, index, step, measure]);

  useEffect(() => {
    if (!open) return undefined;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [open, measure]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
  }, [index, open, rect]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() { writeSeen(storageKey); setOpen(false); }
  function next() { if (index >= steps.length - 1) close(); else setIndex(index + 1); }
  function back() { setIndex(Math.max(0, index - 1)); }

  if (!open || !step) return null;

  const pad = 6;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const vw = typeof window === "undefined" ? 400 : window.innerWidth;
  const cardWidth = Math.min(480, vw - 32);
  const cardLeft = (vw - cardWidth) / 2;
  let cardTop;
  let pointer = null;
  if (rect) {
    const targetMid = rect.top + rect.height / 2;
    const below = targetMid < vh / 2;
    cardTop = below ? rect.top + rect.height + pad + 18 : rect.top - pad - 18 - cardHeight;
    cardTop = Math.max(12, Math.min(vh - cardHeight - 12, cardTop));
    const pointerX = Math.max(cardLeft + 28, Math.min(cardLeft + cardWidth - 28, rect.left + rect.width / 2));
    pointer = { x: pointerX - cardLeft, below };
  } else {
    cardTop = Math.max(12, (vh - cardHeight) / 2);
  }

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label={step.title}>
      <div className="tour-blocker" onClick={(event) => event.stopPropagation()} />
      {rect ? (
        <div
          className="tour-spotlight"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
        />
      ) : <div className="tour-dim" />}
      <div ref={cardRef} className="tour-card" style={{ top: cardTop, left: cardLeft, width: cardWidth }}>
        {pointer && <span className={`tour-pointer ${pointer.below ? "is-top" : "is-bottom"}`} style={{ left: pointer.x - 11 }} />}
        <div className="tour-card-head">
          <span className="tour-step-count">Step {index + 1} of {steps.length}</span>
          <button type="button" className="tour-skip" onClick={close}>Skip tour</button>
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-dots" aria-hidden="true">
          {steps.map((_, i) => <span key={i} className={i === index ? "is-current" : i < index ? "is-done" : ""} />)}
        </div>
        <div className="tour-actions">
          <button type="button" className="tour-back" onClick={back} disabled={index === 0}>Back</button>
          <button type="button" className="tour-next" onClick={next}>{index === steps.length - 1 ? "Finish" : "Next"}</button>
        </div>
      </div>
    </div>
  );
}
