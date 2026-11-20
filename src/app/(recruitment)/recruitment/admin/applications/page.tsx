import { AdminPageSkeleton } from "@/app/(recruitment)/recruitment/components/workspace-skeleton";
import { Suspense } from "react";
import { EvaluationPageContent } from "@/app/(recruitment)/recruitment/components/evaluation-page";

export default function ApplicationAssignmentsPage() {
  return <Suspense fallback={<AdminPageSkeleton view="applications" />}><EvaluationPageContent role="administrator" /></Suspense>;
}
