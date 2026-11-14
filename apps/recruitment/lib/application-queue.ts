import { applicationStatuses } from "./applications.ts";
import type { ApplicationStatus } from "./applications.ts";
import { getOpportunity } from "./catalog.ts";
import type { Track } from "./catalog.ts";
import { record } from "./drafts.ts";

export type QueueFilters = {
  search: string; status: "all" | ApplicationStatus; track: "all" | Track;
  opportunityId: string; assignment: "all" | "assigned" | "unassigned"; review: "all" | "saved" | "missing";
};
export type ApplicationQueue = { filters: QueueFilters; total: number; statusCounts: Record<ApplicationStatus, number> };
export const defaultQueueFilters: QueueFilters = { search: "", status: "all", track: "all", opportunityId: "", assignment: "all", review: "all" };
export function isQueueFilters(v: unknown): v is QueueFilters {
  if (!record(v) || Object.keys(v).sort().join(",") !== "assignment,opportunityId,review,search,status,track") return false;
  if (typeof v.search !== "string" || v.search.length > 100 || !["all", ...applicationStatuses].includes(v.status as ApplicationStatus)
    || !["all", "CORE_TEAM", "COMMITTEE", "MEMBER"].includes(String(v.track)) || !["all", "assigned", "unassigned"].includes(String(v.assignment))
    || !["all", "saved", "missing"].includes(String(v.review)) || typeof v.opportunityId !== "string") return false;
  const opportunity = getOpportunity(v.opportunityId);
  return v.opportunityId === "" || !!opportunity && (v.track === "all" || opportunity.track === v.track);
}
export function isApplicationQueue(v: unknown): v is ApplicationQueue {
  if (!record(v) || !isQueueFilters(v.filters) || !Number.isSafeInteger(v.total) || Number(v.total) < 0 || !record(v.statusCounts)
    || Object.keys(v.statusCounts).sort().join(",") !== [...applicationStatuses].sort().join(",")) return false;
  const counts = v.statusCounts;
  return applicationStatuses.every(key => Number.isSafeInteger(counts[key]) && Number(counts[key]) >= 0)
    && applicationStatuses.reduce((sum, key) => sum + Number(counts[key]), 0) === v.total;
}
export function sameQueueFilters(a: QueueFilters, b: QueueFilters) {
  return Object.keys(defaultQueueFilters).every(key => a[key as keyof QueueFilters] === b[key as keyof QueueFilters]);
}
export function changeQueueTrack(filters: QueueFilters, track: QueueFilters["track"]): QueueFilters {
  const opportunity = getOpportunity(filters.opportunityId);
  return { ...filters, track, opportunityId: track === "all" || opportunity?.track === track ? filters.opportunityId : "" };
}
export const queueIsFiltered = (filters: QueueFilters) => !sameQueueFilters(filters, defaultQueueFilters);
