import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { SaveToast } from "@/components/SaveToast";
import { RouteTransition } from "@/components/RouteTransition";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "TyGuy Game Vault",
    template: "%s | TyGuy Game Vault",
  },
  description: "Tyler's personal game collection and backlog tracker.",
  icons: {
    icon: "/tyguy-icon.png?v=3",
    shortcut: "/tyguy-icon.png?v=3",
    apple: "/tyguy-icon.png?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        <RouteTransition>{children}</RouteTransition>
        <SaveToast />
      </body>
    </html>
  );
}
