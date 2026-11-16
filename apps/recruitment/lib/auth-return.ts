import { getOpportunity } from "./catalog.ts";

type ApplicationAuthError = "failed" | "unconfigured" | "signout-failed";

function applicationPath(path: string, opportunity: unknown, error?: ApplicationAuthError) {
  const params = new URLSearchParams();
  if (typeof opportunity === "string" && getOpportunity(opportunity)) params.set("opportunity", opportunity);
  if (error) params.set("auth", error);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function applicationLandingPath(opportunity: unknown, error?: ApplicationAuthError) {
  return applicationPath("/opportunities", opportunity, error);
}

export function authReturnPath(
  destination: "apply" | "staff" | "membership",
  opportunity: unknown,
  error?: "failed" | "unconfigured",
) {
  if (destination === "staff") return error ? `/staff?auth=${error}` : "/staff";
  if (destination === "membership") return error ? `/membership?auth=${error}` : "/membership";
  return error ? applicationLandingPath(opportunity, error) : applicationPath("/opportunities", opportunity);
}
