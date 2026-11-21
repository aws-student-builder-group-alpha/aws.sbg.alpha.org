"use client";

import { ListSkeleton } from "./workspace-skeleton";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Icon, Modal } from "./ui";
import { signOut } from "@/app/(recruitment)/recruitment/auth/actions";
import { alphaSiteOrigin, recruitmentPath } from "@/recruitment/lib/site-paths";

const sections = [
  { label: "Overview", href: "/recruitment/admin", icon: "sparkles" },
  { label: "Applications", href: "/recruitment/admin/applications", icon: "file" },
  { label: "Intake", href: "/recruitment/admin/intake", icon: "calendar" },
  { label: "Staff accounts", href: "/recruitment/admin/staff", icon: "people" },
  { label: "Organization members", href: "/recruitment/admin/members", icon: "wallet" },
  { label: "Security activity", href: "/recruitment/admin/activity", icon: "shield" },
];

export function AdminPageHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <header className="admin-page-heading"><div><h1>{title}</h1><p>{description}</p></div>{children && <div className="admin-heading-actions">{children}</div>}</header>;
}

function SectionLinks({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return <nav aria-label="Admin sections" className="admin-section-links">{sections.map(section => <div key={section.href}>
    <Link href={section.href} aria-current={path === section.href ? "page" : undefined} onClick={event => { if (!event.defaultPrevented) onNavigate?.(); }}><Icon name={section.icon} size={19} /><span>{section.label}</span></Link>
  </div>)}</nav>;
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? "Signing out…" : "Sign out"}</button>;
}

function positionAccountPopover(popover: HTMLDivElement, trigger: HTMLButtonElement) {
  const margin = 12;
  const gap = 8;
  const anchor = trigger.getBoundingClientRect();
  const width = Math.min(256, window.innerWidth - margin * 2);
  const inSidebar = !!trigger.closest(".admin-sidebar");
  const left = inSidebar ? anchor.right + gap : anchor.left;
  const spaceAbove = anchor.top - gap - margin;
  const spaceBelow = window.innerHeight - anchor.bottom - gap - margin;
  const openAbove = spaceAbove >= 176 || spaceAbove >= spaceBelow;
  const bottom = Math.max(margin, window.innerHeight - (inSidebar ? anchor.bottom : anchor.top - gap));

  popover.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - width - margin))}px`;
  popover.style.top = inSidebar || openAbove ? "auto" : `${Math.max(margin, anchor.bottom + gap)}px`;
  popover.style.bottom = inSidebar || openAbove ? `${bottom}px` : "auto";
  popover.style.maxHeight = `${Math.max(0, inSidebar || openAbove ? window.innerHeight - bottom - margin : spaceBelow)}px`;
}

export function AdminAccount({ label, signedIn = false, pending = false }: { label?: string; signedIn?: boolean; pending?: boolean }) {
  const [notice, setNotice] = useState("");
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;
    const drawer = trigger.closest(".admin-navigation-drawer");
    const reposition = () => {
      if (!popover.matches(":popover-open")) return;
      if (!trigger.getClientRects().length) popover.hidePopover();
      else positionAccountPopover(popover, trigger);
    };
    window.addEventListener("resize", reposition);
    drawer?.addEventListener("scroll", reposition);
    return () => {
      window.removeEventListener("resize", reposition);
      drawer?.removeEventListener("scroll", reposition);
    };
  }, [pending, signedIn]);

  return <div className="admin-account">
    {pending ? <ListSkeleton label="Checking account..." rows={1} /> : signedIn ? <>
      <button ref={triggerRef} className="admin-account-trigger" type="button" popoverTarget={popoverId}>
        <span className="admin-account-avatar" aria-hidden="true">{label?.trim().slice(0, 1).toUpperCase()}</span>
        <span className="admin-account-label">{label || "Signed-in account"}</span>
        <Icon name="chevron" size={15} />
      </button>
      <div ref={popoverRef} id={popoverId} className="admin-account-popover" popover="auto" onBeforeToggle={event => {
        if (event.newState !== "open" || !triggerRef.current) return;
        setNotice("");
        positionAccountPopover(event.currentTarget, triggerRef.current);
      }}>
        <div className="admin-account-actions">
          <Link href="/recruitment/membership">Membership ID</Link>
          <a href={alphaSiteOrigin + "/"}>Back to website</a>
          <form action={signOut} onSubmit={event => {
            const pendingCommand = document.querySelector('[data-command-pending="true"], [data-admin-pending="true"], dialog[open]:not(.admin-navigation-drawer)');
            if (pendingCommand) {
              event.preventDefault();
              setNotice("Finish or reconcile the pending change before signing out.");
              return;
            }
            if (document.querySelector('[data-unsaved="true"], [data-admin-unsaved="true"]') && !window.confirm("Your latest changes have not been saved. Sign out anyway?")) event.preventDefault();
          }}><SignOutButton /></form>
        </div>
        {notice && <p role="alert">{notice}</p>}
      </div>
    </> : <div className="admin-account-actions"><Link href="/recruitment/staff">Check staff access</Link><a href={alphaSiteOrigin + "/"}>Back to website</a></div>}
  </div>;
}

function AdminBrand() {
  return <Link href="/recruitment/admin" className="admin-sidebar-heading" aria-label="Alpha administration overview"><Image src={recruitmentPath("/recruitment/brand/alpha-logo.webp")} alt="" width={36} height={36} /><span><strong>Alpha</strong><small>Recruitment</small></span></Link>;
}

export function AdminShell({ children, account }: { children: ReactNode; account?: ReactNode }) {
  const pathname = usePathname();
  const path = pathname?.replace(/\/$/, "") || "/recruitment/admin";
  const [menu, setMenu] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    workspace.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);
  return <div className="admin-shell">
    <aside className="admin-sidebar"><AdminBrand /><SectionLinks path={path} />{account || <AdminAccount />}</aside>
    <div className="admin-content">
      <div className="admin-mobile-bar"><span>Alpha · Recruitment</span><button type="button" className="button button-secondary" aria-haspopup="dialog" aria-expanded={menu} onClick={() => setMenu(true)}><Icon name="menu" size={18} />Admin sections</button></div>
      <div className="admin-workspace" ref={workspace} role="region" aria-label="Admin workspace" tabIndex={0}>{children}</div>
    </div>
    {menu && <Modal title="Admin sections" className="admin-navigation-drawer" onClose={() => setMenu(false)}><AdminBrand /><SectionLinks path={path} onNavigate={() => setMenu(false)} />{account || <AdminAccount />}</Modal>}
  </div>;
}
