import { opportunities, type Opportunity } from "./catalog.ts";
import { record } from "./drafts.ts";

export type Availability = { updatedAt: string; items: { id: string; capacity: number; remaining: number }[] };
export function isAvailability(value: unknown): value is Availability {
  return record(value) && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
    && Array.isArray(value.items) && value.items.length === opportunities.length
    && new Set(value.items.map(item => record(item) ? item.id : null)).size === opportunities.length
    && value.items.every(item => record(item) && opportunities.some(role => role.id === item.id)
      && Number.isSafeInteger(item.capacity) && Number(item.capacity) > 0 && Number.isSafeInteger(item.remaining) && Number(item.remaining) >= 0 && Number(item.remaining) <= Number(item.capacity));
}
export function availabilityLabel(data: Availability | null, id: string) {
  const item = data?.items.find(role => role.id === id);
  if (!item) return "Vacancies temporarily unavailable";
  return `${item.remaining} ${item.remaining === 1 ? "place" : "places"} remaining`;
}

export function sortByVacancies(roles: readonly Opportunity[], data: Availability | null) {
  if (!data) return [...roles];
  const remaining = new Map(data.items.map(item => [item.id, item.remaining]));
  return [...roles].sort((first, second) => (remaining.get(second.id) ?? -1) - (remaining.get(first.id) ?? -1));
}
