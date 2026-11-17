import { notFound } from "next/navigation";

// The Proxy rewrites wrong-role page requests here before streaming starts.
export default function MissingPage() { notFound(); }
