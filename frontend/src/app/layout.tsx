import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronexis — Venture Risk Simulator",
  description: "800-run Monte Carlo simulation. Identify bottlenecks, failure modes, and role overload before you build.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}