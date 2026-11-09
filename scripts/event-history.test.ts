import assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { mergeEventHistory, type Event } from '../src/data/events'
import { eventHighlights } from '../src/data/event-highlights'

const fixture: Event = {id:'workshop', title:'Original workshop', description:'A public workshop', date:'2026-05-04', time:'1 PM', location:'Online',type:'Online',image:'/Banner.png'}
test('feed outage preserves the verified workshop archive', () => {
  const history=mergeEventHistory([])
  assert.equal(history.length,4)
  assert.ok(history.every(event=>event.sourceUrl?.startsWith('https://www.meetup.com/aws-sbg-at-rizal-technological-univ-mandaluyong-main-campus/events/')))
})
test('fresh feed records update archived events once by ID without losing other history', () => {
  const history=mergeEventHistory([{...fixture,title:'Updated workshop'},null,{id:'broken'}],[fixture,{...fixture,id:'other'}])
  assert.equal(history.length,2)
  assert.equal(history.find(event=>event.id==='workshop')?.title,'Updated workshop')
})
test('the organizer-confirmed SCD recap replaces the conflicting Meetup record', () => {
  const scd=eventHighlights.find(event=>event.replacesMeetupId)
  assert.ok(scd)
  assert.equal(scd.dateLabel,'September 11, 2026')
  assert.deepEqual(mergeEventHistory([{...fixture,id:scd.replacesMeetupId,date:'2026-09-27'}],[]),[])
})
test('highlight media resolves locally and source links remain attributed and secure', () => {
  assert.equal(new Set(eventHighlights.map(event=>event.id)).size,eventHighlights.length)
  for(const event of eventHighlights) {
    assert.ok(existsSync(resolve('public','.'+event.image)))
    assert.equal(new URL(event.sourceUrl).protocol,'https:')
    assert.ok(event.imageCredit.length>0)
  }
  assert.equal(eventHighlights.find(event=>event.id==='ygg-play-summit-2025')?.dateLabel,'2025')
  assert.equal(eventHighlights.find(event=>event.videoUrl)?.videoUrl,'https://www.facebook.com/reel/2276294056483919')
})
