import Link from "next/link";
import { Icon } from "./ui";
import { opportunityLabel, type Opportunity } from "@/lib/catalog";

export function ApplicationOpportunity({ opportunity }: { opportunity: Opportunity }) {
  return <div className="apply-requested">
    <p className="apply-requested-label">{opportunity.track === "CORE_TEAM" ? "Core Team" : "Committee"} · Selected opportunity</p>
    <strong>{opportunityLabel(opportunity)}</strong>
    <Link href="/#opportunities">Change opportunity</Link>
  </div>;
}

export function ApplicationIntroduction({ compact = false }: { compact?: boolean }) {
  if (compact) return <header className="application-introduction application-introduction-compact">
    <h1>Your application.</h1>
  </header>;
  return <header className="application-introduction">
    <h1>Your next chapter <span>starts here.</span></h1>
    <p className="application-intro-copy">Bring your curiosity. Build with a team. Help shape what comes next for Alpha through a Core Team or Committee opportunity.</p>
  </header>;
}

/** Public orientation, never editable progress or persisted consent. */
export function ApplicationGuide() {
  return <section className="application-guide" aria-label="Before you apply">
    <Link href="/#opportunities" className="application-explore">Find your place at Alpha<Icon name="arrow" size={17} /></Link>
    <div className="application-roadmap">
      <p>The path ahead</p>
      <ol className="application-overview" aria-label="Your application journey">
        {["About you", "Opportunity", "Your story", "Review"].map((label, index) => <li key={label}>
          <span className="journey-number" aria-hidden="true">0{index + 1}</span><span>{label}</span>
        </li>)}
      </ol>
    </div>
    <p className="application-brand-note">It’s always Day One. Make this yours.</p>
  </section>;
}
