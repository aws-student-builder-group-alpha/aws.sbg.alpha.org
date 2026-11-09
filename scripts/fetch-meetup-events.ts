/**
 * Build-time script: Fetches events from the Meetup
 * group page for AWS Cloud Club at RTU and writes
 * them to a generated JSON file consumed by the
 * data layer.
 *
 * Usage: npx tsx scripts/fetch-meetup-events.ts
 */

import { writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---- Constants ----

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const MEETUP_BASE = 'https://www.meetup.com'
const GROUP_SLUG =
	'aws-sbg-at-rizal-technological-univ-mandaluyong-main-campus'
const UPCOMING_URL =
	`${MEETUP_BASE}/${GROUP_SLUG}/events/`
const PAST_URL =
	`${MEETUP_BASE}/${GROUP_SLUG}/events/?type=past`
const OUTPUT_PATH = resolve(
	SCRIPT_DIR,
	'../src/data/meetup-events.generated.json',
)
const FALLBACK_IMAGE = '/Banner.png'
const TIMEZONE = 'Asia/Manila'

// ---- Meetup Apollo Cache Types ----

interface ApolloRef {
	__ref: string
}

interface ApolloCache {
	[key: string]: Record<string, unknown>
}

interface MeetupEvent {
	__typename: string
	id: string
	title: string
	description: string
	dateTime: string
	endTime: string
	status: string
	eventType: string
	isOnline: boolean
	eventUrl: string
	going: { totalCount: number }
	featuredEventPhoto: ApolloRef | null
	venue: ApolloRef | null
}

interface MeetupVenue {
	__typename: string
	id: string
	name: string
	address: string
	city: string
}

interface MeetupPhoto {
	__typename: string
	id: string
	baseUrl: string
	highResUrl: string
}

// ---- Output Event interface ----

interface Event {
	id: string
	title: string
	description: string
	date: string
	time: string
	location: string
	type: string
	image: string
	registrationLink?: string
	sourceUrl: string
}

// ---- Fetching ----

async function fetchPageData(
	url: string,
): Promise<ApolloCache | null> {
	const response = await fetch(url, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (compatible; AWSLCAlpha/1.0)',
			'Accept': 'text/html',
		},
	})

	if (!response.ok) {
		console.error(
			`[fetch-events] HTTP ${response.status} for ${url}`,
		)
		return null
	}

	const html = await response.text()
	const match = html.match(
		/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
	)

	if (!match?.[1]) {
		console.error(
			'[fetch-events] __NEXT_DATA__ not found in page',
		)
		return null
	}

	const nextData = JSON.parse(match[1]) as {
		props: {
			pageProps: {
				__APOLLO_STATE__: ApolloCache
			}
		}
	}

	return nextData.props.pageProps.__APOLLO_STATE__
}

// ---- Extraction ----

function extractByTypename<T>(
	cache: ApolloCache,
	typename: string,
): T[] {
	return Object.values(cache).filter(
		(entry) => entry.__typename === typename,
	) as T[]
}

function buildRefMap<T extends { id: string }>(
	items: T[],
	prefix: string,
): Map<string, T> {
	const map = new Map<string, T>()
	for (const item of items) {
		map.set(`${prefix}${item.id}`, item)
	}
	return map
}

// ---- Formatting ----

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
		timeZone: TIMEZONE,
	})
}

function formatTimeRange(
	startIso: string,
	endIso: string,
): string {
	return `${formatTime(startIso)} - ${formatTime(endIso)}`
}

function stripHtml(text: string): string {
	return text
		.replace(/<[^>]*>/g, '')
		.replace(/\*\*(.+?)\*\*/g, '$1')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

// ---- Mapping ----

function mapToEvent(
	raw: MeetupEvent,
	venues: Map<string, MeetupVenue>,
	photos: Map<string, MeetupPhoto>,
): Event {
	const venue = raw.venue
		? venues.get(raw.venue.__ref)
		: undefined

	const location = raw.isOnline
		? 'Online Event'
		: venue
			? [venue.name, venue.city]
				.filter(Boolean)
				.join(', ')
			: 'TBA'

	const photo = raw.featuredEventPhoto
		? photos.get(raw.featuredEventPhoto.__ref)
		: undefined

	const image = photo?.highResUrl ?? FALLBACK_IMAGE

	const event: Event = {
		id: raw.id,
		sourceUrl: raw.eventUrl,
		title: raw.title,
		description: stripHtml(raw.description),
		date: raw.dateTime.slice(0, 10),
		time: formatTimeRange(raw.dateTime, raw.endTime),
		location,
		type: raw.isOnline ? 'Online' : 'In-Person',
		image,
	}

	if (raw.status === 'ACTIVE') {
		event.registrationLink = raw.eventUrl
	}

	return event
}

// ---- Main ----

async function main(): Promise<void> {
	console.error('[fetch-events] Starting Meetup sync...')

	const allEvents: Event[] = []

	for (const url of [UPCOMING_URL, PAST_URL]) {
		console.error(`[fetch-events] Fetching ${url}`)
		const cache = await fetchPageData(url)

		if (!cache) {
			console.error(
				`[fetch-events] Skipping ${url} (no data)`,
			)
			continue
		}

		const rawEvents =
			extractByTypename<MeetupEvent>(cache, 'Event')
		const venues = buildRefMap(
			extractByTypename<MeetupVenue>(cache, 'Venue'),
			'Venue:',
		)
		const photos = buildRefMap(
			extractByTypename<MeetupPhoto>(
				cache,
				'PhotoInfo',
			),
			'PhotoInfo:',
		)

		console.error(
			`[fetch-events] Found ${rawEvents.length} events`,
		)

		for (const raw of rawEvents) {
			if (raw.status === 'CANCELLED') continue
			allEvents.push(mapToEvent(raw, venues, photos))
		}
	}

	// Deduplicate by id
	const seen = new Set<string>()
	const unique = allEvents.filter((e) => {
		if (seen.has(e.id)) return false
		seen.add(e.id)
		return true
	})

	// Sort by date ascending
	unique.sort(
		(a, b) =>
			new Date(a.date).getTime() -
			new Date(b.date).getTime(),
	)

	const json = JSON.stringify(unique, null, '\t')
	writeFileSync(OUTPUT_PATH, json + '\n', 'utf-8')
	console.error(
		`[fetch-events] Wrote ${unique.length} event(s)` +
		` to meetup-events.generated.json`,
	)
}

main().catch((error: unknown) => {
	const message =
		error instanceof Error ? error.message : String(error)
	console.error(`[fetch-events] Fatal error: ${message}`)

	// Graceful fallback: never break the build
	if (!existsSync(OUTPUT_PATH)) {
		writeFileSync(OUTPUT_PATH, '[]\n', 'utf-8')
		console.error(
			'[fetch-events] Wrote empty fallback JSON',
		)
	} else {
		console.error(
			'[fetch-events] Keeping existing JSON file',
		)
	}

	process.exit(0)
})
