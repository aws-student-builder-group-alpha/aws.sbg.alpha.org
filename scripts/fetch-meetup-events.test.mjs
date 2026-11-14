import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

// Run the real generator in an isolated tree, with no network or app data writes.
function generate(mock, existing) {
  const root = mkdtempSync(join(tmpdir(), 'alpha-event-sync-'))
  try {
    mkdirSync(join(root, 'scripts'))
    mkdirSync(join(root, 'src/data'), { recursive: true })
    const script = join(root, 'scripts/fetch-meetup-events.ts')
    const output = join(root, 'src/data/meetup-events.generated.json')
    copyFileSync(new URL('./fetch-meetup-events.ts', import.meta.url), script)
    if (existing !== undefined) writeFileSync(output, existing)
    const setup = 'data:text/javascript,' + encodeURIComponent(mock)
    const result = spawnSync(process.execPath, ['--import', import.meta.resolve('tsx'), '--import', setup, script], {
      encoding: 'utf8', timeout: 15_000,
    })
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stderr)
    return { data: readFileSync(output, 'utf8'), logs: result.stderr }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const offline = `globalThis.fetch = async () => { throw new Error('Offline fixture') }`
const cached = '[{"id":"cached-event"}]\n'

test('first offline startup creates the required empty JSON', () => {
  assert.deepEqual(JSON.parse(generate(offline).data), [])
})

test('offline startup preserves the existing feed byte for byte', () => {
  assert.equal(generate(offline, cached).data, cached)
})

test('HTTP errors and changed Meetup markup preserve the cached feed', () => {
  for (const mock of [
    `globalThis.fetch = async () => new Response('', { status: 503 })`,
    `globalThis.fetch = async () => new Response('<html>Unavailable</html>')`,
  ]) assert.equal(generate(mock, cached).data, cached)
})

test('the ten-second signal bounds response-body reads and falls back', () => {
  const mock = `
    const timeout = AbortSignal.timeout.bind(AbortSignal);
    AbortSignal.timeout = ms => {
      if (ms !== 10000) throw new Error('Wrong request deadline');
      return timeout(20);
    };
    globalThis.fetch = async (_url, { signal }) => ({
      ok: true,
      text: () => new Promise((_resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Body never aborted')), 2000);
        signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason) }, { once: true });
      }),
    });
  `
  const result = generate(mock)
  assert.match(result.logs, /TimeoutError|operation was aborted due to timeout/i)
  assert.deepEqual(JSON.parse(result.data), [])
})

test('successful sync writes fresh events once by ID', () => {
  const mock = `
    globalThis.fetch = async () => new Response('<script id="__NEXT_DATA__">' + JSON.stringify({
      props: { pageProps: { __APOLLO_STATE__: { event: {
        __typename: 'Event', id: 'fresh', title: 'Fresh event', description: 'Workshop',
        dateTime: '2026-11-13T05:00:00Z', endTime: '2026-11-13T06:00:00Z',
        status: 'ACTIVE', isOnline: true, eventUrl: 'https://www.meetup.com/events/fresh',
      } } } },
    }) + '</script>');
  `
  const events = JSON.parse(generate(mock, cached).data)
  assert.equal(events.length, 1)
  assert.equal(events[0].id, 'fresh')
  assert.equal(events[0].registrationLink, 'https://www.meetup.com/events/fresh')
})
