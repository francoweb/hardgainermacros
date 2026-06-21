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
const { injectState, gotoResultados, gotoPlano } = require('./helpers/inject-state');
const { CENARIO_6, CENARIO_4 } = require('./fixtures/scenarios');

const PAGE_SIZE = 6;

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
// Grupo: Página de Atualizações — base
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

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Paginação de Atualizações
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Paginação de Atualizações', () => {

  // ── C-UPD-PAG-1 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-1 — página 1 mostra exatamente PAGE_SIZE cards', async ({ page }) => {
    await gotoAtualizacoes(page);
    const cards = await page.locator('[data-testid="upd-card"]').count();
    expect(cards).toBe(PAGE_SIZE);
  });

  // ── C-UPD-PAG-2 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-2 — paginação aparece no final da lista', async ({ page }) => {
    await gotoAtualizacoes(page);
    await expect(page.locator('[data-testid="upd-pagination"]')).toBeVisible();
  });

  // ── C-UPD-PAG-3 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-3 — botão "Anterior" desativado na primeira página', async ({ page }) => {
    await gotoAtualizacoes(page);
    const prevBtn = page.locator('[data-testid="upd-pg-prev"]');
    await expect(prevBtn).toBeVisible();
    await expect(prevBtn).toBeDisabled();
  });

  // ── C-UPD-PAG-4 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-4 — página 1 está destacada nos números de página', async ({ page }) => {
    await gotoAtualizacoes(page);
    const activePg = page.locator('[data-testid="upd-pg-num"].upd-pg-num--active');
    await expect(activePg).toHaveCount(1);
    await expect(activePg).toHaveText('1');
  });

  // ── C-UPD-PAG-5 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-5 — botão "Próxima" muda para página 2', async ({ page }) => {
    await gotoAtualizacoes(page);

    const firstTitle = (await page.locator('[data-testid="upd-card"] .upd-title').first().textContent() || '').trim();

    await page.locator('[data-testid="upd-pg-next"]').click();
    await page.waitForTimeout(400);

    // Página 2 destacada
    const activePg = page.locator('[data-testid="upd-pg-num"].upd-pg-num--active');
    await expect(activePg).toHaveText('2');

    // Conteúdo mudou
    const newTitle = (await page.locator('[data-testid="upd-card"] .upd-title').first().textContent() || '').trim();
    expect(newTitle).not.toBe(firstTitle);

    // Ainda mostra cards
    const cards = await page.locator('[data-testid="upd-card"]').count();
    expect(cards).toBeGreaterThanOrEqual(1);
  });

  // ── C-UPD-PAG-6 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-6 — botão "Anterior" volta para página 1', async ({ page }) => {
    await gotoAtualizacoes(page);

    const p1Title = (await page.locator('[data-testid="upd-card"] .upd-title').first().textContent() || '').trim();

    // Ir para página 2
    await page.locator('[data-testid="upd-pg-next"]').click();
    await page.waitForTimeout(400);

    // Voltar para página 1
    await page.locator('[data-testid="upd-pg-prev"]').click();
    await page.waitForTimeout(400);

    const backTitle = (await page.locator('[data-testid="upd-card"] .upd-title').first().textContent() || '').trim();
    expect(backTitle).toBe(p1Title);

    // Página 1 destacada novamente
    await expect(page.locator('[data-testid="upd-pg-num"].upd-pg-num--active')).toHaveText('1');

    // Botão Anterior desativado de novo
    await expect(page.locator('[data-testid="upd-pg-prev"]')).toBeDisabled();
  });

  // ── C-UPD-PAG-7 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-7 — números de página funcionam directamente', async ({ page }) => {
    await gotoAtualizacoes(page);

    const pgNums = page.locator('[data-testid="upd-pg-num"]');
    const total  = await pgNums.count();
    expect(total).toBeGreaterThan(1); // mais de 1 página

    // Clicar no último número
    await pgNums.last().click();
    await page.waitForTimeout(400);

    const active = page.locator('[data-testid="upd-pg-num"].upd-pg-num--active');
    const activeText = (await active.textContent() || '').trim();
    expect(parseInt(activeText, 10)).toBe(total);
  });

  // ── C-UPD-PAG-8 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-8 — última página: botão "Próxima" desativado', async ({ page }) => {
    await gotoAtualizacoes(page);

    const pgNums = page.locator('[data-testid="upd-pg-num"]');
    await pgNums.last().click();
    await page.waitForTimeout(400);

    await expect(page.locator('[data-testid="upd-pg-next"]')).toBeDisabled();
  });

  // ── C-UPD-PAG-9 ──────────────────────────────────────────────────────────
  test('C-UPD-PAG-9 — página 1 mostra atualizações mais recentes', async ({ page }) => {
    await gotoAtualizacoes(page);
    // A mais recente deve conter "ml" ou "topo" ou "ajuda" (melhorias de Jun/2026)
    const firstTitle = (await page.locator('[data-testid="upd-card"] .upd-title').first().textContent() || '').trim();
    expect(firstTitle.length).toBeGreaterThan(0);
    // Deve ter data de Junho 2026 no primeiro grupo
    const firstGroup = (await page.locator('[data-testid="upd-group"]').first().textContent() || '');
    expect(firstGroup).toMatch(/Junho 2026/i);
  });

  // ── C-UPD-PAG-10 ─────────────────────────────────────────────────────────
  test('C-UPD-PAG-10 — última página contém atualizações mais antigas', async ({ page }) => {
    await gotoAtualizacoes(page);
    const pgNums = page.locator('[data-testid="upd-pg-num"]');
    await pgNums.last().click();
    await page.waitForTimeout(400);

    // Deve conter entradas mais antigas (Maio 2026 ou anterior)
    const lastGroupText = (await page.locator('[data-testid="upd-group"]').last().textContent() || '');
    expect(lastGroupText).toMatch(/Maio 2026|Abril 2026|Março 2026/i);
  });

  // ── C-UPD-PAG-11 ─────────────────────────────────────────────────────────
  test('C-UPD-PAG-11 — mobile 390px: paginação sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAtualizacoes(page);

    // Verificar sem overflow
    const overflow1 = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow1).toBe(false);

    // Paginação visível
    await expect(page.locator('[data-testid="upd-pagination"]')).toBeVisible();

    // Ir para página 2 e verificar sem overflow
    await page.locator('[data-testid="upd-pg-next"]').click();
    await page.waitForTimeout(400);

    const overflow2 = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow2).toBe(false);
    const cards = await page.locator('[data-testid="upd-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Escopo — componentes da página não afectados pela paginação
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Escopo — componentes não afectados pela paginação', () => {

  // ── C-UPD-SCOPE-1 ────────────────────────────────────────────────────────
  test('C-UPD-SCOPE-1 — Botão "Voltar ao topo" continua funcionando em /atualizacoes', async ({ page }) => {
    await gotoAtualizacoes(page);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    const display = await page.locator('#back-to-top-btn').evaluate(el => el.style.display);
    expect(display).toBe('flex');
  });

  // ── C-UPD-SCOPE-2 ────────────────────────────────────────────────────────
  test('C-UPD-SCOPE-2 — Botão de ajuda continua visível em /atualizacoes', async ({ page }) => {
    await gotoAtualizacoes(page);
    await expect(page.locator('#help-fab')).toBeVisible();
  });

});
