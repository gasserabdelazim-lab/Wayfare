import "./globals.css";
import "leaflet/dist/leaflet.css";
import "./social-design.css";
import "./refinements.css";
import "./wayfare-ui.css";
import "./trip-features.css";
import InstallPrompt from "../components/InstallPrompt";

export const viewport = { themeColor: "#0a1324", colorScheme: "dark" };

export const metadata = {
  title: "Palvoya — plan together",
  description: "Vote on the itinerary, split the costs, plan the trip together.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Palvoya",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
