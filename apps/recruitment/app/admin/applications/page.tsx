import { Suspense } from "react";
import { EvaluationPageContent } from "@/app/components/evaluation-page";

export default function ApplicationAssignmentsPage() {
  return <Suspense fallback={<main id="main-content" className="container portal"><p role="status">Checking administrator access...</p></main>}><EvaluationPageContent role="administrator" /></Suspense>;
}
