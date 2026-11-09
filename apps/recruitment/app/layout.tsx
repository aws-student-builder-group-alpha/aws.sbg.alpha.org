import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Footer, SiteHeader } from "./components/ui";
import { SessionHeader } from "./components/session-header";
import { recruitmentPath } from "@/lib/site-paths";
import "./globals.css";
import "../tokens.css";
import "./redesign.css";
import "./application-workbench.css";
import "./community.css";

export const metadata: Metadata = {
  title: {
    default: "Find your place at Alpha · Recruitment",
    template: "%s · Alpha Recruitment",
  },
  description:
    "A new chapter starts with you. Explore Core Team and Committee opportunities with AWS Student Builder Group Alpha. Bring your curiosity, build your skills, and find your community.",
  icons: { icon: recruitmentPath("/brand/alpha-icon.png"), apple: recruitmentPath("/brand/apple-icon.png") },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth">
      <head>
        <link
          rel="preload"
          href="/brand/geist-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="alpha-app">
        <Suspense fallback={<SiteHeader pendingSession />}>
          <SessionHeader />
        </Suspense>
        {children}
        <Footer />
      </body>
    </html>
  );
}
