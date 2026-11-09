"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useRef, useState } from "react";
import { useHeroLetterMotion, useHeroMotion, useHomeScrollMotion, useOpportunityTextMotion } from "./components/motion";
import { HomePreloader } from "./components/home-preloader";
import { HeroGradient } from "./components/hero-gradient";
import { HomePreparation } from "./components/home-preparation";
import { ImmersiveCard } from "./components/immersive-card";
import { ApplicationAction, Badge, Icon, Modal } from "./components/ui";
import { getOpportunity, opportunities, opportunityLabel, trackLabel, type Opportunity, type Track } from "@/lib/catalog";
import { alphaSiteOrigin, recruitmentBasePath, recruitmentPath } from "@/lib/site-paths";
import "./immersive-home.css";

const operationsRoleDetails: Partial<Record<string, string>> = {
  "core-operations": "Coordinate event plans, organize volunteer assignments, and help the team respond when schedules or staffing change.",
  "committee-operations": "Support event setup, registration, and attendee assistance. Follow the event plan and flag issues to the team so they can be resolved quickly.",
};

function heroWords(text: string) {
  const words = text.split(" ");
  return words.map((word, wordIndex) => (
    <Fragment key={`${word}-${wordIndex}`}>
      <span className="hero-word">
        {Array.from(word).map((letter, letterIndex) => (
          <span className="hero-letter" key={`${letter}-${letterIndex}`}>{letter}</span>
        ))}
      </span>
      {wordIndex < words.length - 1 && " "}
    </Fragment>
  ));
}

function HeroActions({ opportunity }: { opportunity?: string }) {
  return <div className="hero-entry-actions">
    <ApplicationAction className="button hero-primary" opportunity={opportunity}>Apply now</ApplicationAction>
    <Link href="#opportunities" className="hero-continue">Find my track</Link>
  </div>;
}

function RecruitmentEntry() {
  const params = useSearchParams();
  const opportunity = getOpportunity(params.get("opportunity") ?? "");
  const error = params.get("auth");
  const notice = error === "unconfigured"
    ? recruitmentBasePath ? "Connect the test backend to use Google sign-in in this preview." : "Google sign-in is currently unavailable."
    : error === "failed"
      ? "Google sign-in could not be completed. Select Apply now to try again."
      : error === "signout-failed" ? "Sign-out could not be confirmed. Reload this page to check your session." : "";
  return <>
    <HeroActions opportunity={opportunity?.id} />
    {(notice || opportunity) && <p className="recruitment-entry-notice" role="status">
      {opportunity && <strong>Selected role: {opportunityLabel(opportunity)}. </strong>}{notice}
    </p>}
  </>;
}

export default function Home() {
  const [filter, setFilter] = useState<"ALL" | Track>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [showPreloader, setShowPreloader] = useState(true);
  const [heroReady, setHeroReady] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  useHeroMotion(pageRef, heroReady);
  useHeroLetterMotion(pageRef);
  useHomeScrollMotion(pageRef, heroReady);
  const groups = new Map<string, Opportunity[]>();
  const visibleOpportunities = opportunities.filter((o) => filter === "ALL" || o.track === filter);
  visibleOpportunities.forEach((o) => {
    const department = o.department.replace(/ Committee$/, "").replace(/ Department$/, "");
    groups.set(department, [...(groups.get(department) || []), o]);
  });
  useOpportunityTextMotion(pageRef, heroReady, filter);
  const departmentGroups = [...groups];
  const selectedRoles = selectedDepartment ? groups.get(selectedDepartment) ?? [] : [];
  const opportunityName = (opportunity: Opportunity) =>
    opportunity.track === "CORE_TEAM"
      ? opportunity.title
      : opportunity.specialization || (opportunity.id === "buildher" ? "Ambassador" : "Committee Member");
  return (
    <main id="main-content" ref={pageRef} className="recruitment-home">
      <noscript><style>{".alpha-app .home-preloader{display:none!important}"}</style></noscript>
      {showPreloader && <HomePreloader
        onComplete={() => {
          setShowPreloader(false);
          setHeroReady(true);
        }}
      />}
      <section className="brand-hero">
        <HeroGradient />
        <div className="container brand-hero-content">
          <div className="hero-introduction">
          <div className="hero-message">
          <div className="hero-emblem" aria-hidden="true">
            <span className="hero-emblem-orbit" /><span className="hero-emblem-orbit hero-emblem-orbit-cross" />
            <Image src={recruitmentPath("/brand/alpha-logo.webp")} alt="" width={88} height={88} priority />
          </div>
          <p className="hero-entry-label"><span />AWS Student Builder Group — Alpha</p>
          <h1 className="brand-headline hero-entry-heading">
            <span className="sr-only">Your next chapter starts here.</span>
            <span className="hero-title-line" aria-hidden="true">{heroWords("Your next chapter")}</span>
            <span className="hero-particle-line">
              <span className="hero-accent-fallback" aria-hidden="true">starts here.</span>
            </span>
          </h1>
          </div>
          <div className="hero-foot">
            <div>
              <p className="hero-description">Your next chapter starts with Alpha. Join the Core Team or a Committee and help build a community of student builders.</p>
              <Suspense fallback={<HeroActions />}><RecruitmentEntry /></Suspense>
            </div>
          </div>
          </div>
        </div>
      </section>

      <section className="opportunities-section opportunities-intro home-recruitment-overlay" id="opportunities">
        <div className="container home-recruitment-content">
        <div className="opportunities-lead">
          <p className="section-kicker">Your next chapter</p>
          <div className="public-heading">
            <h2>Find your place<br />at Alpha.</h2>
            <p>Lead a team or contribute to one. Choose the opportunity that matches your interests and the time you can give.</p>
          </div>
        </div>
        <div className="track-comparison">
          {(["CORE_TEAM", "COMMITTEE"] as const).map((track, index) => (
            <ImmersiveCard className="track-option" key={track}>
              <div className="track-card-top">
                <span className="track-crest card-depth"><Icon name={track === "CORE_TEAM" ? "sparkles" : "globe"} size={30} /></span>
                <span className="track-card-number" aria-hidden="true">0{index + 1}</span>
              </div>
              <p className="track-card-label">{track === "CORE_TEAM" ? "Lead with purpose" : "Learn by contributing"}</p>
              <h3 className="card-depth">{trackLabel(track)}</h3>
              <p>{track === "CORE_TEAM" ? "Shape the chapter’s work. Support your department, bring people together, and turn plans into action." : "Contribute to events, creative work, partnerships, or technical projects. Learn with a team while building your skills."}</p>
              <dl>
                <div><dt>Who can apply</dt><dd>{track === "CORE_TEAM" ? "1st and 2nd year undergraduates" : "All enrolled university year levels"}</dd></div>
                <div><dt>Opportunities</dt><dd>{track === "CORE_TEAM" ? "6 leadership vacancies" : "10 opportunities across 8 departments"}</dd></div>
              </dl>
              <Link href="#opportunity-catalog" className="track-link" onClick={() => setFilter(track)}>Explore {trackLabel(track)}<Icon name="arrow" className="action-arrow" /></Link>
            </ImmersiveCard>
          ))}
        </div>
        </div>
      </section>

      <section className="opportunity-catalog-section" id="opportunity-catalog" aria-labelledby="opportunity-catalog-heading">
        <div className="opportunity-catalog-stage">
          <div className="container catalog-heading">
            <div className="catalog-intro">
              <p className="eyebrow">November recruitment</p>
              <h3 id="opportunity-catalog-heading" data-home-reveal="">Explore the roles</h3>
              <p>Explore the departments, then open one to compare its roles and find where you can contribute.</p>
              <div className="segmented" aria-label="Filter opportunities">
                {([["ALL", "All roles", "All opportunities"], ["CORE_TEAM", "Core Team", "Core Team"], ["COMMITTEE", "Committee", "Committee"]] as const).map(([key, label, name]) => (
                  <button key={key} type="button" aria-label={name} aria-pressed={filter === key} aria-controls="opportunity-results" onClick={() => setFilter(key)}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        <p className="container catalog-result-count" role="status">{visibleOpportunities.length} roles across {departmentGroups.length} departments</p>
        <div className="container opportunity-directory" id="opportunity-results">
          {departmentGroups.map(([department, items], index) => (
            <div className="department-step" key={department}>
            <ImmersiveCard className="department-panel position-card">
                  <button
                    type="button"
                    className="opportunity-row"
                    aria-haspopup="dialog"
                    aria-label={`Explore department: ${department}`}
                    onClick={() => setSelectedDepartment(department)}
                  >
                    <span className="position-card-copy">
                      <span className="department-card-top"><span className="department-card-icon"><Icon name={items[0].icon} size={26} /></span><span className="position-card-kicker">Department {String(index + 1).padStart(2, "0")} / {String(departmentGroups.length).padStart(2, "0")}</span></span>
                      <span className="opportunity-row-name">{department}</span>
                      <span className="position-card-description">{items[0].description}</span>
                      <span className="position-card-tracks">{(["CORE_TEAM", "COMMITTEE"] as const).filter(track => items.some(item => item.track === track)).map(track => <span key={track}>{trackLabel(track)}</span>)}</span>
                      <span className="position-card-open">Explore {items.length} {items.length === 1 ? "role" : "roles"}<Icon name="arrow" className="action-arrow opportunity-row-cta" /></span>
                    </span>
                  </button>
            </ImmersiveCard>
            </div>
          ))}
        </div>
        </div>
      </section>

      <section className="preparation-section" id="prepare" aria-labelledby="preparation-heading">
        <div className="container preparation-layout">
          <div className="preparation-introduction">
            <p className="section-kicker">Make your first move</p>
            <h2 id="preparation-heading" data-home-reveal="">Ready when<br /><span>you are.</span></h2>
            <p>Gather what you need before you open the form. You can save your draft and come back when you’re ready.</p>
            <Link href="#process" className="preparation-main-link">See how to apply <Icon name="arrow" className="action-arrow" /></Link>
          </div>
          <div className="preparation-card-stage"><HomePreparation /></div>
        </div>
      </section>

      <section className="community-section">
        <div className="container community-layout">
          <div>
            <h2 data-home-reveal="">Learn by building.<br />Grow together.</h2>
            <p>Contribute to the work behind Alpha, from community events and creative campaigns to cloud, AI, and web projects.</p>
            <p>You don’t need a perfect portfolio. Share what you want to learn and how you can contribute.</p>
            <a href={alphaSiteOrigin + "/"} target={alphaSiteOrigin ? "_blank" : undefined} rel="noreferrer" className="community-link">Get to know Alpha <Icon name="external" className="action-arrow" /></a>
          </div>
          <figure data-home-reveal="photo">
            <Image src={recruitmentPath("/brand/day-one-banner.webp")} alt="Alpha’s It’s Always Day One chapter banner" width={1640} height={924} sizes="(max-width: 767px) 100vw, 50vw" />
            <figcaption>Our chapter. Your next community.</figcaption>
          </figure>
        </div>
      </section>

      <section className="process-section container" id="process" aria-labelledby="how-to-apply-title">
        <div className="public-heading" data-home-reveal="">
          <div><p className="section-kicker">Your application, step by step</p><h2 id="how-to-apply-title">How to apply</h2></div>
          <p>Choose one opportunity for the November recruitment cycle. You can change roles while your application is still a draft.</p>
        </div>
        <ol className="application-process">
          {[
            ["Choose a role", "Compare Core Team and Committee eligibility. Open a role’s details to see what you’ll do, then select Apply for this opportunity.", "#opportunity-catalog", "Browse opportunities"],
            ["Sign in and start a draft", "Continue with Google, read the privacy notice, and give consent to start your draft. Your progress saves as you go.", "/apply", "Start application"],
            ["Complete the form", "Add your student details and availability. In Your story, write three required responses, including the role scenario. Each answer can be up to 150 words.", "#prepare", "See what to prepare"],
            ["Review, submit and track", "Add a view-only HTTPS resume link, check your answers, and submit. A portfolio is optional. Return to My application for your receipt and status.", "/application", "My application"],
          ].map(([title, description, href, label], i) => (
            <li key={title}>
              <span className="process-number" aria-hidden="true">0{i + 1}</span>
              <div className="process-guide-copy" data-home-reveal=""><h3>{title}</h3><p>{description}</p></div>
              {href === "/apply"
                ? <ApplicationAction className="process-guide-link">{label}<Icon name="arrow" className="action-arrow" /></ApplicationAction>
                : <Link href={href} className="process-guide-link">{label}<Icon name="arrow" className="action-arrow" /></Link>}
            </li>
          ))}
        </ol>
      </section>

      <section className="faq-section container" id="faq" aria-labelledby="faq-heading">
        <div>
          <div data-home-reveal=""><p className="section-kicker">Before you apply</p><h2 id="faq-heading">Frequently asked questions</h2></div>
          <p>Have another question?<br /><a href="mailto:awslc.alpha@gmail.com">Contact the Alpha team</a>.</p>
        </div>
        <div className="faq-list">
          {[
            ["Do I need experience to apply?", "No. Beginners are welcome. We look at your motivation, practical thinking, willingness to learn, and realistic commitment. A resume link is required; a portfolio is optional."],
            ["Can I apply from another university?", "Yes. Both tracks welcome applicants from any university. Core Team is for current first- and second-year undergraduate students; Committee welcomes all enrolled university year levels, including postgraduate students."],
            ["Can I apply for more than one role?", "You can submit one application for one opportunity in this recruitment cycle. You can change your choice while drafting. Your answers stay, and you will review the updated scenario before continuing."],
            ["What are SkillBuilders and BuildHer+?", "They are departments under Committee. SkillBuilders offers Cloud, AI/ML, and Web Development opportunities. The BuildHer+ Ambassador role is open to all eligible Committee applicants."],
            ["When can I apply?", "The November 2026 recruitment cycle runs from 1 to 30 November, Philippine time. Complete your application and review your answers before submitting."],
          ].map(([q, a]) => (
            <details key={q}>
              <summary><span className="faq-question-label">{q}</span><Icon name="chevron" size={18} /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="apply-invitation container">
        <div data-home-reveal=""><h2>Ready to apply?</h2><p>Find your opportunity for November 2026.</p></div>
        <ApplicationAction className="button button-orange">Start application <Icon name="arrow" className="action-arrow" /></ApplicationAction>
      </section>

      {selectedDepartment && <Modal title={selectedDepartment} className="opportunity-modal department-modal" onClose={() => setSelectedDepartment(null)}>
        <div className="modal-body opportunity-details">
          <p className="department-modal-lead">Choose the role that fits your interests and eligibility.</p>
          <div className="department-role-options">
          {selectedRoles.map(role => <article className="department-role-option" aria-labelledby={`department-role-${role.id}`} data-role={role.id} key={role.id}>
            <Badge tone="orange">{trackLabel(role.track)}</Badge>
            <h3 id={`department-role-${role.id}`}>{opportunityName(role)}</h3>
            <p>{operationsRoleDetails[role.id] ?? role.description}</p>
            <h4>Who can apply</h4>
            <p>{role.track === "CORE_TEAM" ? "Currently enrolled first- and second-year undergraduates from any university." : "Currently enrolled university students at any year or program level."}</p>
            <ApplicationAction className="button button-orange" opportunity={role.id}>Apply for this opportunity <Icon name="arrow" className="action-arrow" /></ApplicationAction>
          </article>)}
          </div>
          <p className="opportunity-prepare-note">Have your current proof of enrollment, available days and a view-only resume link ready. A portfolio is optional.</p>
        </div>
      </Modal>}
    </main>
  );
}
