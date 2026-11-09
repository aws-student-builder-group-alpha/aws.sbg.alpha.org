import type { DraftInput } from "./drafts.ts";
import { validateSubmission } from "./applications.ts";

export const fieldsByStep = [["processingConsent"], ["fullName", "preferredName", "mobile", "university", "otherUniversity", "campus", "program", "programLevel", "year", "yearExplanation", "enrolled"], ["opportunityId", "track", "eligibility"], ["availabilityDays", "experience", "motivation", "collaboration", "availability", "pathway", "scenario"], ["resumeUrl", "portfolioUrl"], ["accuracy", "processingConsent"]];
export const simplifiedStages = [1, 2, 3, 5];
export const simplifiedFields = [[], fieldsByStep[1], fieldsByStep[2], ["availabilityDays", "motivation", "collaboration", "scenario", "scenarioReviewedOpportunityId"], [], ["resumeUrl", "portfolioUrl", "accuracy", "processingConsent"]];
export const storyParts = ["background", "motivation", "collaboration", "availability", "pathway", "scenario"] as const;
export type StoryPart = typeof storyParts[number];
export const partFields = (part: StoryPart) => part === "background" ? ["availabilityDays", "experience"] : [part];
export function firstUnfinishedStoryPart(draft: DraftInput): StoryPart {
  const errors = validateSubmission(draft);
  return storyParts.find(part => partFields(part).some(field => errors[field])) ?? "motivation";
}
export function blockedDestination(draft: DraftInput, stage: number, part: StoryPart = "background") {
  const errors = validateSubmission(draft);
  if (draft.formVersion === 2) {
    for (const index of simplifiedStages.filter(index => index < stage)) {
      const scoped = Object.fromEntries(Object.entries(errors).filter(([key]) => simplifiedFields[index].includes(key)));
      if (Object.keys(scoped).length) return { stage: index, part, errors: scoped };
    }
    return errors.form || errors.stage ? { stage, part, errors: { form: errors.form || errors.stage } } : null;
  }
  for (let index = 0; index <= stage; index++) {
    const fields = index === stage ? index === 3 ? storyParts.slice(0, storyParts.indexOf(part)).flatMap(partFields) : [] : fieldsByStep[index];
    const scoped = Object.fromEntries(Object.entries(errors).filter(([key]) => fields.includes(key)));
    if (Object.keys(scoped).length) {
      const blockedPart = index === 3 ? firstUnfinishedStoryPart(draft) : part;
      return { stage: index, part: blockedPart, errors: index === 3 ? Object.fromEntries(Object.entries(scoped).filter(([key]) => partFields(blockedPart).includes(key))) : scoped };
    }
  }
  return errors.form || errors.stage ? { stage: Math.min(stage, 5), part, errors: { form: errors.form || errors.stage } } : null;
}
