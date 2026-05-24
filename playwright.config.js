// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright E2E — Hardgainer Macros
 *
 * Por omissão usa http://127.0.0.1:5500 (VS Code Live Server).
 * Para testar produção: BASE_URL=https://www.hardgainermacros.com npx playwright test
 *
 * IMPORTANTE: o servidor local deve suportar SPA routing (servir index.html
 * para rotas desconhecidas). O VS Code Live Server funciona se configurado com:
 *   "liveServer.settings.file": "index.html"
 * Alternativa: npx serve . -p 5500 --single
 */
module.exports = defineConfig({
  globalSetup: require.resolve('./tests/global-setup.js'),
  testDir: './tests',
  timeout: 30_000,
  navigationTimeout: 60_000,   // headroom para primeiro carregamento (Live Server)
  fullyParallel: false,
  workers: 1,                  // evita race condition com 2 browsers em paralelo
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5500',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'pt-BR',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
