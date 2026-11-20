import { ReviewerPageSkeleton } from "@/app/(recruitment)/recruitment/components/workspace-skeleton";
import { Suspense } from "react";
import { EvaluationPageContent } from "@/app/(recruitment)/recruitment/components/evaluation-page";

export default function ReviewerPage() {
  return <Suspense fallback={<ReviewerPageSkeleton />}><EvaluationPageContent role="evaluator" /></Suspense>;
}
