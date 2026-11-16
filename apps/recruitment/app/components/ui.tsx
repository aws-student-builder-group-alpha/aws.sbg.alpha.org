"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import { motionPresets, useEntrance, useGSAP } from "./motion";
import { signOut, startApplication } from "@/app/auth/actions";
import { alphaSiteOrigin, chapterLinks, recruitmentPath } from "@/lib/site-paths";
import type { ApplicationStatus } from "@/lib/applications";
import type { StaffRole, StaffStatus } from "@/lib/staff";

const paths: Record<string, ReactNode> = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  arrow: <path d="M4 12h15M13 5l7 7-7 7" />,
  external: (
    <>
      <path d="M14 3h7v7M21 3l-11 11" />
      <path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  moon: <path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 5a5 5 0 0 1 4 5" />
    </>
  ),
  code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" />,
  sparkles: (
    <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4" />
  ),
  wallet: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <path d="M17 11h4v5h-4a2.5 2.5 0 0 1 0-5M3 8V5a2 2 0 0 1 2-2h12" />
    </>
  ),
  file: <path d="M14 2H5v20h14V7ZM14 2v6h5M8 12h8M8 16h6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 2v6m10-6v6M3 11h18m-13 5h2m4 0h2" />
    </>
  ),
  megaphone: <path d="m3 10 15-6v16L3 14ZM18 10h3v4h-3M6 15l2 6h4l-2-5" />,
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  clip: (
    <path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2a2 2 0 0 1 3 3L5 16" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  search: (
    <>
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 6 6" />
    </>
  ),
  reset: <path d="M3 10a9 9 0 1 1 1 7M3 3v7h7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  shield: (
    <>
      <path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7v1" />
    </>
  ),
  warning: <><path d="M12 3 2 21h20Z" /><path d="M12 9v5m0 3v1" /></>,
  error: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m-6 0 6-6" /></>,
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 5 10 8L22 5" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  twitter: <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />,
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01" />
    </>
  ),
  chart: <path d="M4 3v18h18M9 16v-5m5 5V7m5 9V3" />,
};
export function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name] ?? paths.sparkles}
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return <a href={alphaSiteOrigin + "/"} className={compact ? "brand" : "brand brand-masthead"} aria-label="Alpha home">
    <Image src={recruitmentPath("/brand/alpha-logo.webp")} alt="" width={compact ? 44 : 48} height={compact ? 44 : 48} priority />
    <span>
      <strong><span className="brand-full-name">{compact ? "AWS SBG — Alpha" : "AWS Student Builder Group - Alpha"}</span><span className="brand-short-name">{compact ? "Alpha" : "AWS SBG — Alpha"}</span></strong>
      <small>{compact ? "Recruitment" : <><span className="brand-full-name">Rizal Technological University</span><span className="brand-short-name">RTU</span></>}</small>
    </span>
  </a>;
}

type HeaderStaff = { role: StaffRole; status: StaffStatus; needsMfa: boolean };
type WorkspaceFrame = "applicant" | "administrator" | "evaluator" | "staff";
function useWorkspaceFrame(): WorkspaceFrame | undefined {
  // Activity retains hidden page DOM; the active router tree owns the shared frame.
  const segments = useSelectedLayoutSegments();
  if (segments.length === 1 && ["apply", "application"].includes(segments[0])) return "applicant";
  if (segments.length === 1 && segments[0] === "staff") return "staff";
  if (segments.length === 1 && segments[0] === "reviewer") return "evaluator";
  if (segments[0] === "admin" && (segments.length === 1 || segments.length === 2 && ["applications", "intake"].includes(segments[1]))) return "administrator";
  return undefined;
}
export function ApplicationAction({ children, className, opportunity }: { children: ReactNode; className: string; opportunity?: string }) {
  return <form className="application-action" action={startApplication}>
    {opportunity && <input type="hidden" name="opportunity" value={opportunity} />}
    <ApplicationActionButton className={className}>{children}</ApplicationActionButton>
  </form>;
}

function ApplicationActionButton({ children, className }: { children: ReactNode; className: string }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={pending} aria-busy={pending}>
    {pending ? "Connecting…" : children}
  </button>;
}

type HeaderProps = { signedIn?: boolean; staff?: HeaderStaff; pendingSession?: boolean; member?: boolean; accountLabel?: string };
export function SiteHeader(props: HeaderProps) {
  const path = usePathname();
  const frame = useWorkspaceFrame();
  return <HeaderContent key={path} path={path} frame={frame} {...props} />;
}
function HeaderContent({ path, frame, signedIn = false, staff, pendingSession = false, member = false, accountLabel = "Account" }: HeaderProps & { path: string; frame?: WorkspaceFrame }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const accountButton = useRef<HTMLButtonElement>(null);
  const menuId = useId(), accountId = useId();
  const dark = !!frame || ["/", "/membership"].includes(path);
  function closeMenu() { setMenuOpen(false); menuButton.current?.focus(); }
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const style = document.documentElement.style;
    const previous = style.getPropertyValue("--site-header-height");
    let published = "";
    const measure = () => {
      if (!row.getClientRects().length) return;
      published = `${row.getBoundingClientRect().height}px`;
      style.setProperty("--site-header-height", published);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(row); measure();
    return () => { observer.disconnect(); if (style.getPropertyValue("--site-header-height") === published) { if (previous) style.setProperty("--site-header-height", previous); else style.removeProperty("--site-header-height"); } };
  }, []);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let previous = window.scrollY, frameId = 0;
    const update = () => {
      frameId = 0;
      const y = Math.max(0, window.scrollY);
      header.dataset.scrolled = String(y > 20);
      header.dataset.hidden = String(!reduce.matches && !menuOpen && !accountOpen && !header.contains(document.activeElement) && y > 100 && y > previous);
      previous = y;
    };
    const scroll = () => { if (!frameId) frameId = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", scroll, { passive: true });
    reduce.addEventListener("change", update);
    return () => { cancelAnimationFrame(frameId); window.removeEventListener("scroll", scroll); reduce.removeEventListener("change", update); };
  }, [menuOpen, accountOpen]);
  useEffect(() => {
    if (!accountOpen) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setAccountOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [accountOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings: [HTMLElement, boolean][] = [];
    let child: HTMLElement | null = headerRef.current;
    while (child?.parentElement) {
      for (const sibling of child.parentElement.children) if (sibling !== child && sibling instanceof HTMLElement && !["SCRIPT", "STYLE", "LINK"].includes(sibling.tagName)) { siblings.push([sibling, sibling.inert]); sibling.setAttribute("inert", ""); }
      if (child.parentElement === document.body) break;
      child = child.parentElement;
    }
    closeButton.current?.focus();
    const desktop = matchMedia("(min-width: 80em)");
    const resize = () => { if (!menuButton.current?.getClientRects().length) { setMenuOpen(false); (accountButton.current || navRef.current?.querySelector<HTMLElement>("a"))?.focus(); } };
    desktop.addEventListener("change", resize);
    const rowObserver = new ResizeObserver(resize);
    if (rowRef.current) rowObserver.observe(rowRef.current);
    return () => { rowObserver.disconnect(); document.body.style.overflow = previousOverflow; siblings.forEach(([node, inert]) => { node.toggleAttribute("inert", inert); }); desktop.removeEventListener("change", resize); };
  }, [menuOpen]);
  const links: { href: string; label: string }[] = [];
  if (!staff && signedIn) links.push(member ? { href: "/membership", label: "Membership ID" } : { href: "/application?resume=1", label: "My application" });
  else if (staff && (staff.status !== "active" || staff.needsMfa)) links.push({ href: "/staff", label: "Staff sign-in" });
  else if (staff?.role === "administrator") links.push({ href: "/admin/applications", label: "Applications" }, { href: "/admin/intake", label: "Intake" }, { href: "/admin", label: "Staff management" });
  else if (staff) links.push({ href: "/reviewer", label: "Organization Head" });
  if (!member) links.push({ href: "/membership", label: "Membership ID" });
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="site-header-space" data-tone={dark ? "dark" : "light"} aria-hidden="true" />
    <header ref={headerRef} className="site-header" data-workspace-frame={frame} data-adaptive={path === "/" ? "home" : "page"} data-tone={dark ? "dark" : "light"} data-menu-open={menuOpen}
      onKeyDown={event => { if (event.key === "Escape") { if (menuOpen) { event.preventDefault(); closeMenu(); } else if (accountOpen) { event.preventDefault(); setAccountOpen(false); accountButton.current?.focus(); } } }}>
      <div ref={rowRef} className="header-inner">
        <Brand />
        <div className="header-actions"><button ref={menuButton} type="button" className="icon-button mobile-menu-button" aria-label="Open menu" aria-controls={menuId} aria-expanded={menuOpen} onClick={() => { setAccountOpen(false); setMenuOpen(true); }}><Icon name="menu" size={24} /></button></div>
        <nav ref={navRef} id={menuId} aria-label={menuOpen ? "Main navigation menu" : "Main navigation"} role={menuOpen ? "dialog" : undefined} aria-modal={menuOpen ? true : undefined} className="main-nav" data-open={menuOpen}
          onClick={event => { if ((event.target as HTMLElement).closest("a")) { if (menuOpen) closeMenu(); setAccountOpen(false); } }}
          onKeyDown={event => { if (menuOpen && event.key === "Tab") { const controls = Array.from(navRef.current?.querySelectorAll<HTMLElement>("a,button:not(:disabled)") || []).filter(node => node.getClientRects().length); const first = controls[0], last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } } }}>
          <button ref={closeButton} type="button" className="nav-close icon-button" aria-label="Close menu" onClick={closeMenu}><Icon name="close" size={28} /></button>
          <div className="nav-chapter-links">{chapterLinks.map(link => <a key={link.path} href={alphaSiteOrigin + link.path}>{link.label}</a>)}</div>
          <span className="nav-divider" aria-hidden="true" />
          <div ref={accountRef} className="account-navigation" data-signed-in={signedIn} data-open={accountOpen}>
            {signedIn && <button ref={accountButton} type="button" className="account-trigger" aria-expanded={accountOpen} aria-controls={accountId} onClick={() => setAccountOpen(!accountOpen)}><span>{accountLabel}</span><Icon name="chevron" size={16} /></button>}
            <div id={accountId} className="account-dropdown">
              {links.map(link => <Link key={link.href} href={link.href} aria-current={path === link.href.split("?")[0] ? "page" : undefined}>{link.label}</Link>)}
              {!staff && !signedIn && !pendingSession && <ApplicationAction className="nav-apply">Apply now</ApplicationAction>}
              {signedIn && <form action={signOut} onSubmit={event => { if (document.querySelector('[data-unsaved="true"]') && !window.confirm("Your latest changes have not been saved. Sign out anyway?")) event.preventDefault(); }}><button type="submit" className="text-button">Sign out</button></form>}
            </div>
          </div>
          <Image className="mobile-menu-mark" src={recruitmentPath("/brand/alpha-logo.webp")} alt="" width={48} height={48} />
        </nav>
      </div>
    </header>
    <noscript><nav className="header-no-script" aria-label="Chapter links">{chapterLinks.map(link => <a key={link.path} href={alphaSiteOrigin + link.path}>{link.label}</a>)}{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}<Link href="/opportunities">Available roles</Link></nav></noscript>
  </>;
}

export function Footer() {
  const frame = useWorkspaceFrame();
  const path = usePathname();
  // Active route information remains correct when Activity retains hidden pages.
  if (frame || path === "/apply" || path.startsWith("/apply/")) return null;
  const socials = [
    { name: "Facebook", icon: "facebook", href: "https://www.facebook.com/AWSStudentBuilderGroupAlpha" },
    { name: "X (Twitter)", icon: "twitter", href: "https://x.com/awslc_alpha" },
    { name: "LinkedIn", icon: "linkedin", href: "https://linkedin.com/company/aws-learning-club-alpha" },
    { name: "Instagram", icon: "instagram", href: "https://instagram.com/awslc.alpha" },
  ];
  return <footer className="site-footer" data-workspace-frame={frame}>
    <div className="container footer-standard">
      <p className="footer-signature" aria-hidden="true">AWS Student Builder Group Alpha</p>
      <div className="footer-inner">
        <div className="footer-chapter">
          <div className="footer-identity">
            <a href={alphaSiteOrigin + "/"} className="footer-logo" aria-label="Alpha home">
              <Image src={recruitmentPath("/brand/alpha-logo.webp")} alt="" width={44} height={44} />
            </a>
            <div>
              <p className="footer-chapter-name">AWS Student Builder Group - Alpha</p>
              <p className="footer-university">Rizal Technological University</p>
            </div>
          </div>
          <p className="footer-description">Build cloud skills through hands-on projects, shared learning, and community collaboration.</p>
          <nav className="footer-socials" aria-label="Alpha social media">
            {socials.map((social) => <a key={social.icon} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={`${social.name} (opens in a new tab)`}>
              <Icon name={social.icon} size={18} />
            </a>)}
          </nav>
        </div>
        <nav className="footer-links" aria-label="Footer quick links">
          <h2>Quick links</h2>
          {chapterLinks.map(link => <a key={link.path} href={alphaSiteOrigin + link.path}>{link.label}</a>)}
        </nav>
        <section className="footer-contact" aria-label="Contact Alpha">
          <h2>Contact</h2>
          <address>
            <a href="mailto:awslc.alpha@gmail.com"><Icon name="mail" size={16} /><span>awslc.alpha@gmail.com</span></a>
            <p>Rizal Technological University</p>
            <p>Boni Avenue, Mandaluyong City</p>
          </address>
        </section>
      </div>
      <div className="footer-bottom">
        <p className="footer-credit">© 2026 AWS Student Builder Group - Alpha. All rights reserved.</p>
        <nav className="footer-utilities" aria-label="Recruitment information"><Link href="/privacy">Privacy notice</Link><Link href="/staff">Staff sign-in</Link></nav>
        <p className="footer-day-one" aria-hidden="true">Day One</p>
      </div>
    </div>
    <div className="workspace-footer container">
      <p>© 2026 AWS Student Builder Group — Alpha</p>
      <nav aria-label="Workspace footer">
        <Link href="/privacy">Privacy</Link>
        <a href="mailto:awslc.alpha@gmail.com">Contact</a>
        <Link href="/staff">Staff sign-in</Link>
      </nav>
    </div>
  </footer>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const tone =
    status === "Accepted"
      ? "green"
      : status === "Waitlisted"
        ? "orange"
        : status === "Not Selected" || status === "Withdrawn"
          ? "neutral"
          : "blue";
  return (
    <Badge tone={tone}>
      <span className="badge-dot" />
      {status}
    </Badge>
  );
}
export function Callout({
  children,
  tone = "info",
  title, actions, role, id, className = "",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  title?: string; actions?: ReactNode; role?: "alert" | "status"; id?: string; className?: string;
}) {
  const heading = title ?? (tone === "warning" ? "Please check" : tone === "error" ? "Something needs attention" : undefined);
  const body = typeof children === "string" || typeof children === "number" ? <p>{children}</p> : children;
  return (
    <div className={`callout notice callout-${tone} ${className}`} role={role} id={id}>
      <Icon name={tone === "success" ? "check" : tone} />
      <div className="notice-content">{heading && <strong className="notice-title">{heading}</strong>}{body}{actions && <div className="notice-actions">{actions}</div>}</div>
    </div>
  );
}
export function FieldError({ id, children, role }: { id: string; children: ReactNode; role?: "alert" | "status" }) {
  return <p className="field-error" id={id} role={role}><Icon name="error" size={15} />{children}</p>;
}
export function ErrorSummary({ children, ref }: { children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  return <div className="error-summary" role="alert" tabIndex={-1} ref={ref}><Icon name="error" /><div>{children}</div></div>;
}
export function Modal({
  title,
  headerContent,
  children,
  onClose,
  dismissible = true,
  className,
}: {
  title: string;
  headerContent?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  dismissible?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useGSAP(
    () => {
      const dialog = ref.current;
      const previousFocus = document.activeElement as HTMLElement | null;
      dialog?.showModal();
      return () => {
        dialog?.close();
        if (previousFocus?.isConnected)
          previousFocus.focus({ preventScroll: true });
      };
    },
    { scope: ref },
  );
  useEntrance(ref, { duration: motionPresets.dialog, allowFocused: true });
  return (
    <dialog
      ref={ref}
      className={className ? `modal ${className}` : "modal"}
      aria-label={headerContent ? title : undefined}
      aria-labelledby={headerContent ? undefined : "modal-title"}
      onCancel={event => { event.preventDefault(); if (dismissible) onClose(); }}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        {headerContent || <h2 id="modal-title">{title}</h2>}
        <button
          className="icon-button"
          type="button"
          disabled={!dismissible}
          onClick={onClose}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export { formatDate } from "@/lib/format-date";
