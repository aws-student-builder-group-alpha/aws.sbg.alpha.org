import Link from "next/link";
import { ApplicationAction, Icon } from "./ui";
import { ImmersiveCard } from "./immersive-card";

const preparation = [
  ["Your student details", "University, program, current year and available days."],
  ["Three short answers", "Why you want to join, a time you worked with others, and your chosen role’s scenario. Up to 150 words each."],
  ["Resume and enrollment proof", "A view-only HTTPS resume link and a private enrollment upload are required. Your portfolio is optional."],
];

/** Public guidance only: consent and draft creation remain behind verified access. */
export function HomePreparation() {
  return (
    <ImmersiveCard as="aside" className="home-preparation" id="home-preparation" labelledBy="home-preparation-title">
      <div className="preparation-label">
        <span>Before you begin</span>
        <Icon name="file" size={20} />
      </div>
      <h2 id="home-preparation-title" className="card-depth">A little preparation.<br />A clearer start.</h2>
      <p className="preparation-lead">Have these ready before starting. You can review your answers before submitting.</p>
      <ol className="preparation-list">
        {preparation.map(([title, description], index) => (
          <li key={title}>
            <span className="preparation-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{title}</h3><p>{description}</p></div>
          </li>
        ))}
      </ol>
      <ApplicationAction className="button button-orange preparation-start">Start application <Icon name="arrow" className="action-arrow" /></ApplicationAction>
      <p className="preparation-signin">Next: sign in with Google. Your application is not submitted yet.</p>
      <Link href="/privacy" className="preparation-privacy"><Icon name="shield" size={16} />Read the recruitment privacy notice</Link>
    </ImmersiveCard>
  );
}
