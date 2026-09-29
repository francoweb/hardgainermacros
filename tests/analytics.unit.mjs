import assert from 'node:assert/strict';

const storage = new Map();
const appendedScripts = [];
const listeners = new Map();

globalThis.location = {
  hostname: 'hardgainermacros.com',
  pathname: '/',
  search: '',
  href: 'https://hardgainermacros.com/',
};
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
};
globalThis.document = {
  title: 'Hardgainer Macros',
  head: { appendChild: element => appendedScripts.push(element) },
  createElement: () => ({}),
  addEventListener: (name, listener) => listeners.set(name, listener),
};
globalThis.window = globalThis;

const { initAnalytics, trackPageView } = await import('../assets/js/modules/analytics.js');

initAnalytics();
trackPageView();
assert.equal(appendedScripts.length, 0, 'GA4 não deve carregar sem consentimento');

storage.set('hg:analytics-consent', 'refused');
trackPageView();
assert.equal(appendedScripts.length, 0, 'GA4 não deve carregar após recusa');

storage.set('hg:analytics-consent', 'accepted');
listeners.get('hg:cookie-consent')({ detail: 'accepted' });
assert.equal(appendedScripts.length, 1, 'GA4 deve carregar após consentimento');
assert.match(appendedScripts[0].src, /G-BP9K0KY3TE/);

const pageViews = () => dataLayer.filter(args => args[0] === 'event' && args[1] === 'page_view');
assert.equal(pageViews().length, 1, 'a rota inicial deve gerar um page_view');

location.pathname = '/faq';
location.href = 'https://hardgainermacros.com/faq';
trackPageView();
trackPageView();
assert.equal(pageViews().length, 2, 'cada nova rota deve gerar apenas um page_view');
assert.equal(pageViews()[1][2].page_path, '/faq');

console.log('Analytics consent and SPA pageviews: OK');
