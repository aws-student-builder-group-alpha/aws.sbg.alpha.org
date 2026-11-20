import { Suspense, type ReactNode } from "react";
import { RecruitmentShell } from "../components/recruitment-shell";
import { AdminAccount } from "../components/admin-shell";
import { accountSession } from "@/recruitment/lib/server/session";

async function SidebarAccount() {
  const session = await accountSession();
  const signedIn = session.kind === "applicant" || session.kind === "staff";
  return <AdminAccount label={signedIn ? session.identity.name.trim() || session.identity.email : undefined} signedIn={signedIn} />;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RecruitmentShell frame="administrator" adminAccount={<Suspense fallback={<AdminAccount pending />}><SidebarAccount /></Suspense>}>{children}</RecruitmentShell>;
}
