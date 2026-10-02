const paths = {
  car: <><path d="m5 10 2-5h10l2 5M3 16v-6h18v6H3ZM5 16v3m14-3v3M6 13h2m8 0h2" /></>,
  train: <><rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 10h14M12 3v7M8 18l-3 3m11-3 3 3M8 14h1m6 0h1"/></>,
  bus: <><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3m8-3v3M7 15h2m6 0h2"/></>,
  plane: <path d="m3 10 7 2 6-8c2-2 4 0 2 2l-6 8 2 7-3-1-2-5-5-2Z"/>,
  groceries: <><path d="M2 4h3l3 12h11l3-9H6M10 7V4m5 3V3"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  coffee: <><path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 9h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2"/></>,
  food: <><path d="M5 3v6m3-6v6m3-6v6M5 9h6M8 9v12M19 3c-4 2-4 9 0 9V3Zm0 9v9"/></>,
  lodging: <><path d="M3 19V9m18 10V9M3 15h18M5 15V6h14v9M8 10h3m2 0h3"/></>,
  activity: <><path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4Z"/><path d="M9 6v12" strokeDasharray="2 3"/></>,
  shopping: <><path d="M5 8h14l1 13H4ZM8 8V6a4 4 0 0 1 8 0v2"/></>,
  tag: <><path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="8" cy="8" r="1"/></>,
  group: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.3c2.5.3 4.5 2.3 4.5 5.2"/></>,
  beach: <><path d="M12 12V3M7 7l5 5 5-5M3 21c3-4 15-4 18 0M4 16c4-5 12-5 16 0"/></>,
  mountain: <><path d="m3 19 7-12 4 7 2-3 5 8Z"/><circle cx="17" cy="6" r="2"/></>,
  camp: <><path d="M12 4 3 20h18L12 4Zm0 6-5 10M12 10l5 10"/></>,
  ski: <><circle cx="17" cy="5" r="2"/><path d="m3 20 8-9 2 3 7-10M8 15l4 5"/></>,
  boat: <><path d="M4 15h16l-2 5H6ZM7 15V6h4l5 5M7 9h7"/></>,
};
export default function ExpenseIcon({ name, label }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>{paths[name] || paths.tag}</svg>;
}
