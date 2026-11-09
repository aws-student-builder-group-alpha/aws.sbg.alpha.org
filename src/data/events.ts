import meetupEventsJson from './meetup-events.generated.json'
import { eventHighlights } from './event-highlights'
import workshopArchive from './alpha-workshops.json'

export interface Event {
	id: string
	title: string
	description: string
	date: string // ISO date string (YYYY-MM-DD)
	time: string
	location: string
	type: string
	image: string
	registrationLink?: string
	sourceUrl?: string
}

function isValidEvent(
	obj: unknown,
): obj is Event {
	if (typeof obj !== 'object' || obj === null) {
		return false
	}
	const e = obj as Record<string, unknown>
	return (
		typeof e.id === 'string' &&
		typeof e.title === 'string' &&
		typeof e.description === 'string' &&
		typeof e.date === 'string' &&
		typeof e.time === 'string' &&
		typeof e.location === 'string' &&
		typeof e.type === 'string' &&
		typeof e.image === 'string'
	)
}

/** Retain verified history during a feed outage; current feed records win by ID. */
export function mergeEventHistory(liveEvents: unknown[], archive: unknown[] = workshopArchive): Event[] {
  const merged = new Map<string, Event>()
  for (const event of [...archive, ...liveEvents]) {
    if (isValidEvent(event) && !eventHighlights.some(highlight => highlight.replacesMeetupId === event.id)) {
      merged.set(event.id, event)
    }
  }
  return [...merged.values()]
}

export const events = mergeEventHistory(meetupEventsJson as unknown[])

/**
 * Format an ISO date string to a readable format.
 * e.g. "2026-03-15" -> "March 15, 2026"
 */
export function formatEventDate(dateStr: string): string {
	const date = new Date(dateStr + 'T00:00:00')
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

/** Check if an event date is in the future (upcoming). */
export function isUpcoming(dateStr: string): boolean {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	const eventDate = new Date(dateStr + 'T00:00:00')
	return eventDate >= today
}

/** Get all upcoming events sorted by date ascending. */
export function getUpcomingEvents(): Event[] {
	return events
		.filter((e) => isUpcoming(e.date))
		.sort(
			(a, b) =>
				new Date(a.date).getTime() -
				new Date(b.date).getTime(),
		)
}

/** Get all past events sorted by date descending. */
export function getPastEvents(): Event[] {
	return events
		.filter((e) => !isUpcoming(e.date))
		.sort(
			(a, b) =>
				new Date(b.date).getTime() -
				new Date(a.date).getTime(),
		)
}

/** Get the top N upcoming events. */
export function getTopUpcomingEvents(
	count: number,
): Event[] {
	return getUpcomingEvents().slice(0, count)
}
