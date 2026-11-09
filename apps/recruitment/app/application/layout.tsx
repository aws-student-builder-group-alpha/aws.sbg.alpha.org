import type { ReactNode } from "react";
import { RecruitmentShell } from "../components/recruitment-shell";

export default function ApplicationLayout({ children }: { children: ReactNode }) {
  return <RecruitmentShell frame="applicant">{children}</RecruitmentShell>;
}
