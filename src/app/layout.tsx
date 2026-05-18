import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavShell } from "@/components/nav/NavShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Serpent Ascension League",
  description: "Official hub for the Serpent Ascension League — Season 1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <NavShell>{children}</NavShell>
      </body>
    </html>
  );
}
