export default function NavIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "overview") {
    return <svg {...common}><path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.8V20h13V9.8"/><path d="M10 20v-5.5h4V20"/></svg>;
  }
  if (name === "itinerary") {
    return <svg {...common}><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" strokeWidth="2.4"/></svg>;
  }
  if (name === "places") {
    return <svg {...common}><path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4.5L5.5 20V5a1 1 0 0 1 1-1Z"/></svg>;
  }
  if (name === "group") {
    return <svg {...common}><circle cx="6.5" cy="7" r="2.6"/><path d="m5.3 7.1 1 1 1.8-2"/><circle cx="6.5" cy="16.5" r="2.6"/><path d="M12.5 7h8M12.5 16.5h8"/></svg>;
  }
  if (name === "wall") {
    return <svg {...common}><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/></svg>;
  }
  if (name === "plans") {
    return <svg {...common}><path d="M3.5 6.5 8 4l8 2.5L20.5 4v13.5L16 20l-8-2.5L3.5 20Z"/><path d="M8 4v13.5M16 6.5V20"/></svg>;
  }
  if (name === "settle") {
    return <svg {...common}><rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="M15.5 9.5h5v5h-5a2.5 2.5 0 0 1 0-5Z"/><circle cx="16" cy="12" r=".7" fill="currentColor" stroke="none"/></svg>;
  }
  if (name === "updates") {
    return <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z"/><path d="M10 20h4"/></svg>;
  }
  if (name === "back") {
    return <svg {...common}><path d="M11 5 4 12l7 7"/><path d="M4 12h16"/></svg>;
  }
  return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>;
}
