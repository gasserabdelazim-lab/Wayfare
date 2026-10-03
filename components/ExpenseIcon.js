const paths = {
  car: <><path d="m5 10 2-5h10l2 5M3 16v-6h18v6H3ZM5 16v3m14-3v3M6 13h2m8 0h2" /></>,
  train: <><rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 10h14M12 3v7M8 18l-3 3m11-3 3 3M8 14h1m6 0h1"/></>,
  bus: <><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v3m8-3v3M7 15h2m6 0h2"/></>,
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z"/>,
  groceries: <><path d="M2 4h3l3 12h11l3-9H6M10 7V4m5 3V3"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  coffee: <><path d="M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 9h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2"/></>,
  food: <><path d="M5 3v6m3-6v6m3-6v6M5 9h6M8 9v12M19 3c-4 2-4 9 0 9V3Zm0 9v9"/></>,
  lodging: <><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3"/></>,
  activity: <><path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4Z"/><path d="M9 6v12" strokeDasharray="2 3"/></>,
  shopping: <><path d="M5 8h14l1 13H4ZM8 8V6a4 4 0 0 1 8 0v2"/></>,
  tag: <><path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="8" cy="8" r="1"/></>,
  group: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.3c2.5.3 4.5 2.3 4.5 5.2"/></>,
  beach: <><path d="M12 12V3M7 7l5 5 5-5M3 21c3-4 15-4 18 0M4 16c4-5 12-5 16 0"/></>,
  mountain: <><path d="m3 19 7-12 4 7 2-3 5 8Z"/><circle cx="17" cy="6" r="2"/></>,
  camp: <><path d="M12 4 3 20h18L12 4Zm0 6-5 10M12 10l5 10"/></>,
  ski: <><path d="M12 2v20M4.9 7l14.2 10M19.1 7 4.9 17M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5"/></>,
  boat: <><path d="M4 15h16l-2 5H6ZM7 15V6h4l5 5M7 9h7"/></>,
};
export default function ExpenseIcon({ name, label }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>{paths[name] || paths.tag}</svg>;
}
