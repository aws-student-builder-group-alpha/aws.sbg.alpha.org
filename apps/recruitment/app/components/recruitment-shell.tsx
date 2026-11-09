"use client";

import type { ReactNode } from "react";
import { WaveGradient } from "./wave-gradient";

/** One decorative, viewport-bounded host per recruitment layout, including recovery. */
export function RecruitmentShell({ children, frame }: { children: ReactNode; frame: "applicant" | "staff" | "administrator" | "evaluator" }) {
  return <div className="workspace-frame recruitment-process" data-workspace-frame={frame}>
    <div className="workspace-atmosphere" aria-hidden="true"><WaveGradient hostSelector=".workspace-atmosphere" className="workspace-wave" pointerResponse={false} backgroundColor="#08090a" speed={.35} /></div>
    {children}
  </div>;
}
