import Image from "next/image";
import type { ReactNode } from "react";
import { alphaSiteOrigin, recruitmentPath } from "@/recruitment/lib/site-paths";

export function MembershipFrame({ children, account }: { children: ReactNode; account?: ReactNode }) {
  return <main id="main-content" className="container portal membership-workspace membership-showcase">
    <header className="membership-heading"><div><p className="membership-kicker">ALPHA / COMMUNITY</p><h1>Membership ID</h1></div><a href={alphaSiteOrigin + "/"}>Alpha home <span aria-hidden="true">↗</span></a></header>
    {account && <div className="membership-account">{account}</div>}
    {children}
  </main>;
}
export function MembershipWelcome({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="membership-welcome"><div className="membership-alphy" aria-hidden="true"><span className="membership-orbit"/><Image src={recruitmentPath("/recruitment/brand/alphy.png")} alt="" width={296} height={326}/><span className="membership-day-one">IT’S ALWAYS DAY ONE.</span></div><div className="membership-welcome-copy"><p className="membership-kicker">YOUR PLACE AT ALPHA</p><h2>{title}</h2><p>{description}</p>{children}</div></section>;
}
