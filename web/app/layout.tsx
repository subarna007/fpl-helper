import "./globals.css";
import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { DashboardProvider } from "./_state/DashboardContext";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FPL Helper: squad, captain and transfer planner",
  description:
    "Enter your Fantasy Premier League team ID to see your squad, captain picks, fixture difficulty and a transfer plan for the next gameweeks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <DashboardProvider>{children}</DashboardProvider>
      </body>
    </html>
  );
}
