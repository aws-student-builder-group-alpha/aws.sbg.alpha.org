import type { ReactNode } from "react";
import { RecruitmentShell } from "../components/recruitment-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RecruitmentShell frame="administrator">{children}</RecruitmentShell>;
}
