import { Suspense } from "react";
import { EvaluationPageContent } from "@/app/components/evaluation-page";

export default function ReviewerPage() {
  return <Suspense fallback={<main id="main-content" className="container portal"><p role="status">Checking evaluator access...</p></main>}><EvaluationPageContent role="evaluator" /></Suspense>;
}
