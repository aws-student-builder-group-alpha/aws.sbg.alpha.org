"use client";
import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { WaveGradient } from "./wave-gradient";
import { Icon } from "./ui";

/** The Apply canvas; the shared site navbar owns account navigation. */
export function ProcessShell({ children, unsaved = false, appearance = "navy", surface, contentHeight = false }: { children: ReactNode; unsaved?: boolean; appearance?: "navy" | "dark"; surface?: "paper"; contentHeight?: boolean }) {
  return <div className={`process-root${surface === "paper" ? " process-paper" : ""}`} data-content-height={contentHeight || undefined} data-appearance={appearance} data-unsaved={unsaved ? "true" : undefined}>
    <div className="apply-atmosphere" aria-hidden="true"><WaveGradient hostSelector=".apply-atmosphere" className="apply-wave" pointerResponse={false} backgroundColor="#08090a" speed={.35} /></div>
    {children}
  </div>;
}

export function GoogleSignInButton() {
  const { pending } = useFormStatus();
  return <button className="button button-orange apply-google-button" type="submit" disabled={pending} aria-busy={pending}>{pending ? "Connecting…" : "Continue with Google"}</button>;
}

export function ProcessProgress({ steps, current, onStep, disabled = false, descriptions }: {
  steps: readonly string[]; current: number; onStep: (index: number) => void; disabled?: boolean; descriptions?: readonly string[];
}) {
  return <nav className="process-progress" aria-label="Application progress">
    <div className="process-track">
      {steps.map((step, index) => {
        const label = <span className="progress-copy"><span className="progress-name">{step}</span>{descriptions?.[index] && <small className="progress-description">{descriptions[index]}</small>}</span>;
        return index < current
          ? <button key={step} type="button" className="process-segment done" disabled={disabled} onClick={() => onStep(index)} aria-label={`Go back to step ${index + 1}: ${step}`}><span className="progress-icon"><Icon name="check" size={18} /></span>{label}</button>
          : <span key={step} className={`process-segment${index === current ? " current" : ""}`} aria-current={index === current ? "step" : undefined} aria-label={`Step ${index + 1}: ${step}${index > current ? " (not yet available)" : ""}`}><span className="progress-icon"><span aria-hidden="true">0{index + 1}</span></span>{label}</span>;
      })}
    </div>
  </nav>;
}

export function ProcessActionBar({ exitAction, notice, children }: { exitAction: ReactNode; notice?: ReactNode; children: ReactNode }) {
  return <div className="process-action-bar">
    {notice}
    <div className="process-action-inner">
      {exitAction}
      <div className="process-actions">{children}</div>
    </div>
  </div>;
}
