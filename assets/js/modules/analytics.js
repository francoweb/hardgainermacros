/**
 * GOOGLE ANALYTICS 4
 * Carrega o GA4 apenas depois do consentimento explícito e envia pageviews
 * manualmente para acompanhar a navegação da SPA sem duplicações.
 */

const MEASUREMENT_ID = 'G-BP9K0KY3TE';
const PRODUCTION_HOSTS = new Set(['hardgainermacros.com', 'www.hardgainermacros.com']);

let initialized = false;
let lastTrackedUrl = '';

function hasAnalyticsConsent() {
  try {
    const preference = localStorage.getItem('hg:analytics-consent');
    return preference === 'accepted' || preference === '"accepted"';
  } catch {
    return false;
  }
}

function isProductionSite() {
  return PRODUCTION_HOSTS.has(location.hostname);
}

function loadAnalytics() {
  if (initialized || !hasAnalyticsConsent() || !isProductionSite()) return false;

  initialized = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  return true;
}

export function trackPageView() {
  loadAnalytics();
  if (!initialized || typeof window.gtag !== 'function') return;

  const pageUrl = `${location.pathname}${location.search}`;
  if (pageUrl === lastTrackedUrl) return;

  lastTrackedUrl = pageUrl;
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_location: location.href,
    page_path: pageUrl,
  });
}

export function initAnalytics() {
  loadAnalytics();

  document.addEventListener('hg:cookie-consent', (event) => {
    if (event.detail === 'accepted') trackPageView();
  });
}
