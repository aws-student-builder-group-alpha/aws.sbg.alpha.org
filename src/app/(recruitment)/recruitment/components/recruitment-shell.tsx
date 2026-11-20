"use client";

import type { ReactNode } from "react";
import { WaveGradient } from "./wave-gradient";
import { AdminShell } from "./admin-shell";

/** Every process workspace shares the applicant atmosphere. */
export function RecruitmentShell({ children, frame, adminAccount }: { children: ReactNode; frame: "applicant" | "staff" | "administrator" | "evaluator"; adminAccount?: ReactNode }) {
  return <div className="workspace-frame recruitment-process" data-workspace-frame={frame}>
    <div className="workspace-atmosphere" aria-hidden="true"><WaveGradient hostSelector=".workspace-atmosphere" className="workspace-wave" pointerResponse={false} backgroundColor="#08090a" speed={.35} /></div>
    {frame === "administrator" ? <AdminShell account={adminAccount}>{children}</AdminShell> : children}
  </div>;
}
