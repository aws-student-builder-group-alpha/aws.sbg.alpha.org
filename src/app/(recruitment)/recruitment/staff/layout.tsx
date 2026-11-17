import type { ReactNode } from "react";
import { RecruitmentShell } from "../components/recruitment-shell";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <RecruitmentShell frame="staff">{children}</RecruitmentShell>;
}
