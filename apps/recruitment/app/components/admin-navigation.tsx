import Link from "next/link";

export function AdminNavigation({ current }: { current: "staff" | "applications" | "intake" }) {
  return <nav aria-label="Administration" className="admin-navigation">
    <Link href="/admin/applications" aria-current={current === "applications" ? "page" : undefined}>Applications</Link>
    <Link href="/admin/intake" aria-current={current === "intake" ? "page" : undefined}>Intake</Link>
    <Link href="/admin" aria-current={current === "staff" ? "page" : undefined}>Staff management</Link>
  </nav>;
}
