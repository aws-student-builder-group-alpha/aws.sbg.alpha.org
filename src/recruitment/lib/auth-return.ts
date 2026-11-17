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
  return applicationPath("/recruitment/opportunities", opportunity, error);
}

export function authReturnPath(
  destination: "apply" | "staff" | "membership",
  opportunity: unknown,
  error?: "failed" | "unconfigured",
) {
  if (destination === "staff") return error ? `/recruitment/staff?auth=${error}` : "/recruitment/staff";
  if (destination === "membership") return error ? `/recruitment/membership?auth=${error}` : "/recruitment/membership";
  return error ? applicationLandingPath(opportunity, error) : applicationPath("/recruitment/opportunities", opportunity);
}
