/** Run in the document head, before native restoration and smooth-scroll startup. */
export const HOME_RELOAD_SCROLL = `(() => {
  const entry = performance.getEntriesByType('navigation')[0];
  if (location.pathname !== '/' || entry?.type !== 'reload') return;
  const previous = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  const top = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  top();
  window.addEventListener('pageshow', event => { if (!event.persisted) top(); }, { once: true });
  window.addEventListener('pagehide', () => { history.scrollRestoration = previous; }, { once: true });
})();`
