import type { ReactNode } from "react";
import { RecruitmentShell } from "../components/recruitment-shell";

export default function ReviewerLayout({ children }: { children: ReactNode }) {
  return <RecruitmentShell frame="evaluator">{children}</RecruitmentShell>;
}
