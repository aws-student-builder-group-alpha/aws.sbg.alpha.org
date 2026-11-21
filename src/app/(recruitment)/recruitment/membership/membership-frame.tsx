import type { ReactNode } from "react";
import PixelWolf from "@/app/(main)/(landing)/hero/pixel-wolf";
import { recruitmentPath } from "@/recruitment/lib/site-paths";
import { Icon } from "../components/ui";

export function MembershipFrame({ children, account }: { children: ReactNode; account?: ReactNode }) {
  return <main id="main-content" className="container portal membership-workspace membership-showcase">
    <header className="membership-heading">
      <a href={recruitmentPath("/opportunities")}>
        <Icon name="arrow" size={18} className="membership-back-icon" />
        Back to Opportunities
      </a>
      <h1>Membership ID</h1>
    </header>
    {account && <div className="membership-account">{account}</div>}
    {children}
  </main>;
}
export function MembershipWelcome({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="membership-welcome">
    <div className="membership-alphy" aria-hidden="true">
      <span className="membership-orbit" />
      <PixelWolf dimensional pose="wave" tilt={-8} />
    </div>
    <div className="membership-welcome-copy">
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  </section>;
}
