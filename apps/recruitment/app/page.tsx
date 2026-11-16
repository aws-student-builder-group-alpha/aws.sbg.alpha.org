import { Suspense } from "react";
import { redirect } from "next/navigation";
export default function RecruitmentHome({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
 return <Suspense fallback={<main className="container"><h1>Available Roles</h1></main>}><LegacyEntry searchParams={searchParams} /></Suspense>;
}
async function LegacyEntry({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
 const params = await searchParams;
 const query = new URLSearchParams();
 for (const key of ["track", "q", "opportunity", "auth"]) if (typeof params[key] === "string") query.set(key, params[key]);
 redirect("/opportunities" + (query.size ? "?" + query.toString() : ""));
 return null;
}
