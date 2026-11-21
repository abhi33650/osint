import type { Metadata, Viewport } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LinkTrack — Consent-Based Location Intelligence",
  description:
    "Consent-based location tracking links and email digital-footprint intelligence.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
