import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Footer, SiteHeader } from "./components/ui";
import { SessionHeader } from "./components/session-header";
import { PageLoader } from "./components/page-loader";
import { recruitmentPath } from "@/recruitment/lib/site-paths";
import "./globals.css";
import "@/recruitment/tokens.css";
import "./redesign.css";
import "./application-workbench.css";
import "./community.css";
import "./header.css";
import "./page-loader.css";

export const metadata: Metadata = {
  title: {
    default: "Find your place at Alpha · Recruitment",
    template: "%s · Alpha Recruitment",
  },
  description:
    "A new chapter starts with you. Explore Core Team and Committee opportunities with AWS Student Builder Group Alpha. Bring your curiosity, build your skills, and find your community.",
  icons: { icon: recruitmentPath("/recruitment/brand/alpha-icon.png"), apple: recruitmentPath("/recruitment/brand/apple-icon.png") },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-scroll-behavior="smooth">
      <head>
        <link
          rel="preload"
          href="/recruitment/brand/geist-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="alpha-app">
        <noscript><style>{`.recruitment-page-loader{display:none!important}`}</style></noscript>
        <PageLoader />
        <Suspense fallback={<SiteHeader pendingSession />}>
          <SessionHeader />
        </Suspense>
        {children}
        <Footer />
      </body>
    </html>
  );
}
