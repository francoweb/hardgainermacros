// @ts-check
'use strict';

/**
 * updates.spec.js
 *
 * Testes E2E para a página /atualizacoes.
 * Página sempre acessível (sem proteção de rota).
 * Estratégia: navegar via pushState a partir da home.
 */

const { test, expect } = require('@playwright/test');

/** Navega para /atualizacoes via SPA router. */
async function gotoAtualizacoes(page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.evaluate(() => {
    history.pushState({}, '', '/atualizacoes');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForSelector('[data-testid="upd-card"]', { timeout: 10000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Página de Atualizações
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Página de Atualizações (/atualizacoes)', () => {

  test('C-UPD-1 — /atualizacoes abre sem redirecionar para outra rota', async ({ page }) => {
    await gotoAtualizacoes(page);
    expect(page.url()).toMatch(/\/atualizacoes$/);
    await expect(page.getByText('Atualizações').first()).toBeVisible();
  });

  test('C-UPD-2 — página mostra pelo menos 1 card de atualização', async ({ page }) => {
    await gotoAtualizacoes(page);
    const cards = page.locator('[data-testid="upd-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
    // Primeiro card tem título e descrição visíveis
    await expect(cards.first().locator('.upd-title')).toBeVisible();
    await expect(cards.first().locator('.upd-desc')).toBeVisible();
  });

  test('C-UPD-3 — link "Atualizações" no footer existe e navega para /atualizacoes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    const footerLink = page.locator('footer a[href="/atualizacoes"]');
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveText('Atualizações');

    await footerLink.click();
    await page.waitForSelector('[data-testid="upd-card"]', { timeout: 10000 });
    expect(page.url()).toMatch(/\/atualizacoes$/);
  });

  test('C-UPD-4 — mobile 390px: página sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAtualizacoes(page);

    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    // Cards visíveis no mobile
    await expect(page.locator('[data-testid="upd-card"]').first()).toBeVisible();
  });

  test('C-UPD-5 — "Voltar ao início" navega para /', async ({ page }) => {
    await gotoAtualizacoes(page);

    const backLink = page.locator('a.legal-back');
    await expect(backLink).toBeVisible();
    await backLink.click();

    await page.waitForURL('**/');
    expect(page.url()).toMatch(/\/$/);
  });

});
