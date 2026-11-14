import { opportunities } from "./catalog.ts";
import { record } from "./drafts.ts";

export type Availability = { updatedAt: string; items: { id: string; capacity: number | null; remaining: number | null }[] };
export function isAvailability(value: unknown): value is Availability {
  return record(value) && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt))
    && Array.isArray(value.items) && value.items.length === opportunities.length
    && new Set(value.items.map(item => record(item) ? item.id : null)).size === opportunities.length
    && value.items.every(item => record(item) && opportunities.some(role => role.id === item.id)
      && (item.id === "general-member" ? item.capacity === null && item.remaining === null
        : Number.isSafeInteger(item.capacity) && Number(item.capacity) > 0 && Number.isSafeInteger(item.remaining) && Number(item.remaining) >= 0 && Number(item.remaining) <= Number(item.capacity)));
}
export function availabilityLabel(data: Availability | null, id: string) {
  const item = data?.items.find(role => role.id === id);
  if (!item) return "Vacancies temporarily unavailable";
  return item.capacity === null ? "No fixed limit" : `${item.remaining} ${item.remaining === 1 ? "place" : "places"} remaining`;
}
