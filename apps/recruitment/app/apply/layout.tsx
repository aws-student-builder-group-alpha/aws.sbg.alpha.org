import type { ReactNode } from "react";

export default function ApplyLayout({ children }: { children: ReactNode }) {
  return <div className="workspace-frame apply-process" data-workspace-frame="applicant">{children}</div>;
}
