import { emptyDraftInput } from "../../lib/drafts.ts";
import { questionsFor } from "../../lib/catalog.ts";
export function validSubmission() {
  const value = emptyDraftInput();
  Object.assign(value, { opportunityId: "core-secretariat", processingConsent: true, resumeUrl: "https://example.test/resume.pdf", accuracy: true, stage: 5 });
  Object.assign(value.profile, { fullName: "Synthetic Applicant", university: "Example University", program: "Information Technology", programLevel: "undergraduate", year: "2", enrolled: true, availability: ["Monday"], experience: "I enjoy learning with classmates." });
  for (const question of questionsFor(value.opportunityId)) value.answers[question.id] = Array(question.min).fill("learning").join(" ");
  return value;
}
export function validSimplifiedSubmission() {
  const value = validSubmission();
  value.formVersion = 2; value.scenarioReviewedOpportunityId = value.opportunityId;
  value.profile.experience = ""; value.answers.availability = ""; value.answers.pathway = "";
  for (const question of questionsFor(value.opportunityId, 2)) value.answers[question.id] = "A brief answer in my own words.";
  return value;
}
