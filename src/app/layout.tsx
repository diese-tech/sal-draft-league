import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { NavShell } from "@/components/nav/NavShell";
import { TickerBar } from "@/components/nav/TickerBar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sal-draft-league.vercel.app"),
  title: "Serpent Ascension League",
  description: "Official hub for the Serpent Ascension League - Season 1",
  icons: {
    icon: [{ url: "/assets/sal-logo.png", type: "image/png" }],
    apple: "/assets/sal-logo.png",
  },
  openGraph: {
    title: "Serpent Ascension League",
    description: "Official hub for the Serpent Ascension League - Season 1",
    images: ["/assets/sal-logo.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <NavShell ticker={<TickerBar />}>{children}</NavShell>
      </body>
    </html>
  );
}
