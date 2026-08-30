export default function manifest() {
  return {
    name: "Wayfare — plan together",
    short_name: "Wayfare",
    description: "Plan trips together, vote on activities, and settle shared expenses.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f1e6",
    theme_color: "#1c2b2e",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
