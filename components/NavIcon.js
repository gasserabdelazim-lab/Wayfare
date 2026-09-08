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

  if (name === "plans") {
    return <svg {...common}><path d="M3.5 6.5 8 4l8 2.5L20.5 4v13.5L16 20l-8-2.5L3.5 20Z"/><path d="M8 4v13.5M16 6.5V20"/></svg>;
  }
  if (name === "settle") {
    return <svg {...common}><rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="M15.5 9.5h5v5h-5a2.5 2.5 0 0 1 0-5Z"/><circle cx="16" cy="12" r=".7" fill="currentColor" stroke="none"/></svg>;
  }
  if (name === "updates") {
    return <svg {...common}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z"/><path d="M10 20h4"/></svg>;
  }
  return <svg {...common}><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>;
}
