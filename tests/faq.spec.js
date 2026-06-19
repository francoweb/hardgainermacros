// @ts-check
'use strict';

/**
 * faq.spec.js
 *
 * Testes E2E para a página /faq (Perguntas Frequentes).
 * Página sempre acessível (sem proteção de rota).
 * Estratégia: navegar via pushState a partir da home.
 */

const { test, expect } = require('@playwright/test');

/** Navega para /faq via SPA router. */
async function gotoFaq(page) {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.evaluate(() => {
    history.pushState({}, '', '/faq');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForSelector('[data-testid="faq-item"]', { timeout: 10000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Página FAQ
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Página de Perguntas Frequentes (/faq)', () => {

  test('C-FAQ-1 — /faq abre sem redirecionar e mostra o título', async ({ page }) => {
    await gotoFaq(page);
    expect(page.url()).toMatch(/\/faq$/);
    await expect(page.getByText('Perguntas Frequentes').first()).toBeVisible();
  });

  test('C-FAQ-2 — página tem pelo menos 76 itens no DOM (51 perguntas + 25 glossário)', async ({ page }) => {
    await gotoFaq(page);
    const items = page.locator('[data-testid="faq-item"]');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(76);
  });

  test('C-FAQ-3 — busca por "PDF" mostra perguntas relacionadas e oculta outras', async ({ page }) => {
    await gotoFaq(page);

    await page.locator('#faq-search').fill('PDF');
    await page.waitForTimeout(300);

    // Mensagem de zero resultados deve estar oculta (há resultados para PDF)
    await expect(page.locator('#faq-no-results')).toBeHidden();

    // Deve haver pelo menos 1 item visível
    const visibleCount = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="faq-item"]')]
        .filter(el => el.style.display !== 'none').length
    );
    expect(visibleCount).toBeGreaterThanOrEqual(1);

    // Deve haver itens ocultos (nem todos são sobre PDF)
    const hiddenCount = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="faq-item"]')]
        .filter(el => el.style.display === 'none').length
    );
    expect(hiddenCount).toBeGreaterThan(0);
  });

  test('C-FAQ-4 — busca por termo inexistente mostra mensagem amigável', async ({ page }) => {
    await gotoFaq(page);

    await page.locator('#faq-search').fill('zzznotexistzzz');
    await page.waitForTimeout(300);

    await expect(page.locator('#faq-no-results')).toBeVisible();
    const msg = (await page.locator('#faq-no-results').textContent()) || '';
    expect(msg).toMatch(/Nenhuma dúvida encontrada/i);
    expect(msg).toMatch(/Contato/i);
  });

  test('C-FAQ-5 — clicar numa pergunta abre a resposta; clicar novamente fecha', async ({ page }) => {
    await gotoFaq(page);

    const firstItem = page.locator('[data-testid="faq-item"]').first();

    // Inicialmente fechado
    await expect(firstItem).not.toHaveAttribute('open');

    // Abrir
    await firstItem.locator('summary').click();
    await expect(firstItem).toHaveAttribute('open', '');
    await expect(firstItem.locator('.faq-answer')).toBeVisible();

    // Fechar
    await firstItem.locator('summary').click();
    await expect(firstItem).not.toHaveAttribute('open');
  });

  test('C-FAQ-6 — link "FAQ" no footer existe e navega para /faq', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    const footerLink = page.locator('footer a[href="/faq"]');
    await expect(footerLink).toBeVisible();
    await expect(footerLink).toHaveText('FAQ');

    await footerLink.click();
    await page.waitForSelector('[data-testid="faq-item"]', { timeout: 10000 });
    expect(page.url()).toMatch(/\/faq$/);
  });

  test('C-FAQ-7 — mobile 390px: página sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoFaq(page);

    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    await expect(page.locator('[data-testid="faq-item"]').first()).toBeVisible();
  });

  test('C-FAQ-8 — "Voltar ao início" navega para /', async ({ page }) => {
    await gotoFaq(page);

    const backLink = page.locator('a.legal-back');
    await expect(backLink).toBeVisible();
    await backLink.click();

    await page.waitForURL('**/');
    expect(page.url()).toMatch(/\/$/);
  });

  test('C-FAQ-9 — accordion exclusivo: abrir uma pergunta fecha as outras', async ({ page }) => {
    await gotoFaq(page);

    const items  = page.locator('[data-testid="faq-item"]');
    const first  = items.nth(0);
    const second = items.nth(1);

    // Abrir a primeira
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');

    // Abrir a segunda — a primeira deve fechar automaticamente
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    await expect(first).not.toHaveAttribute('open');

    // Fechar a segunda clicando nela novamente
    await second.locator('summary').click();
    await expect(second).not.toHaveAttribute('open');
  });

  test('C-FAQ-10 — busca por "Kcal" encontra termos do glossário', async ({ page }) => {
    await gotoFaq(page);

    await page.locator('#faq-search').fill('Kcal');
    await page.waitForTimeout(300);

    // Mensagem de zero resultados deve estar oculta (há resultados)
    await expect(page.locator('#faq-no-results')).toBeHidden();

    // Deve haver pelo menos 1 item visível
    const visibleCount = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid="faq-item"]')]
        .filter(el => el.style.display !== 'none').length
    );
    expect(visibleCount).toBeGreaterThanOrEqual(1);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Grupo: Botão Flutuante de Ajuda (FAB)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Botão flutuante de ajuda (FAB)', () => {

  test('C-FAB-1 — FAB visível na home (desktop)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('[data-testid="help-fab"]')).toBeVisible();
  });

  test('C-FAB-2 — clicar no FAB navega para /faq', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.locator('#help-fab-btn').click();
    await page.waitForSelector('[data-testid="faq-item"]', { timeout: 10000 });
    expect(page.url()).toMatch(/\/faq$/);
  });

  test('C-FAB-3 — FAB não aparece na página /faq', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.evaluate(() => {
      history.pushState({}, '', '/faq');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="faq-item"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="help-fab"]')).toHaveCount(0);
  });

  test('C-FAB-4 — clicar no × minimiza o widget: ? e × ocultam, restaurar aparece', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Estado normal: ? e × visíveis, restaurar oculto
    await expect(page.locator('#help-fab-btn')).toBeVisible();
    await expect(page.locator('#help-fab-dismiss')).toBeVisible();
    await expect(page.locator('#help-fab-restore')).toBeHidden();

    // Minimizar
    await page.locator('#help-fab-dismiss').click();
    await page.waitForTimeout(200);

    // Estado minimizado: ? e × ocultos, restaurar visível
    await expect(page.locator('#help-fab-btn')).toBeHidden();
    await expect(page.locator('#help-fab-dismiss')).toBeHidden();
    await expect(page.locator('#help-fab-restore')).toBeVisible();

    // FAB continua no DOM
    await expect(page.locator('[data-testid="help-fab"]')).toBeVisible();
  });

  test('C-FAB-4b — clicar no botão minimizado restaura ? e ×; ? navega para /faq', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Minimizar
    await page.locator('#help-fab-dismiss').click();
    await page.waitForTimeout(200);
    await expect(page.locator('#help-fab-restore')).toBeVisible();

    // Restaurar
    await page.locator('#help-fab-restore').click();
    await page.waitForTimeout(200);

    // Estado normal restaurado
    await expect(page.locator('#help-fab-btn')).toBeVisible();
    await expect(page.locator('#help-fab-dismiss')).toBeVisible();
    await expect(page.locator('#help-fab-restore')).toBeHidden();

    // ? ainda navega para /faq
    await page.locator('#help-fab-btn').click();
    await page.waitForSelector('[data-testid="faq-item"]', { timeout: 10000 });
    expect(page.url()).toMatch(/\/faq$/);
  });

  test('C-FAB-5 — estado minimizado persiste ao navegar; restaurar aparece', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // Minimizar
    await page.locator('#help-fab-dismiss').click();
    await page.waitForTimeout(200);

    // Navegar para outra página
    await page.evaluate(() => {
      history.pushState({}, '', '/atualizacoes');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(500);

    // Estado minimizado persiste: ? oculto, restaurar visível
    await expect(page.locator('#help-fab-btn')).toBeHidden();
    await expect(page.locator('#help-fab-restore')).toBeVisible();
  });

  test('C-FAB-6 — FAB não aparece na área de print', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    const isHiddenInPrint = await page.evaluate(() => {
      const sheets = [...document.styleSheets];
      for (const sheet of sheets) {
        try {
          const rules = [...sheet.cssRules];
          for (const rule of rules) {
            if (rule.media && [...rule.media].some(m => m.includes('print'))) {
              if (rule.cssText.includes('help-fab') && rule.cssText.includes('none')) return true;
            }
          }
        } catch {}
      }
      return false;
    });
    expect(isHiddenInPrint).toBe(true);
  });

  test('C-FAB-7 — FAB fica abaixo do modal (z-index < 1000)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    const fabZIndex = await page.evaluate(() => {
      const fab = document.getElementById('help-fab');
      if (!fab) return 0;
      return parseInt(getComputedStyle(fab).zIndex, 10) || 0;
    });
    expect(fabZIndex).toBeLessThan(1000);
    expect(fabZIndex).toBeGreaterThan(0);
  });

  test('C-FAB-8 — mobile 390px: FAB visível sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page.locator('[data-testid="help-fab"]')).toBeVisible();
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('C-FAB-9 — /faq, /atualizacoes e plano continuam funcionando com FAB', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');

    // /faq
    await page.evaluate(() => {
      history.pushState({}, '', '/faq');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForSelector('[data-testid="faq-item"]', { timeout: 10000 });
    await expect(page.locator('h1.hero-title')).toBeVisible();

    // /atualizacoes
    await page.evaluate(() => {
      history.pushState({}, '', '/atualizacoes');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/Atualizações|FAQ mais completa/i);

    // home
    await page.evaluate(() => {
      history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForTimeout(500);
    const inputs = await page.locator('input[type="number"]').count();
    expect(inputs).toBeGreaterThanOrEqual(1);
  });

  test('C-FAB-10 — FAB não sobrepõe o botão "Voltar ao topo" no plano', async ({ page }) => {
    // Navegar para o plano via SPA (requer dados no storage — simular preenchimento básico)
    await page.goto('/');
    await page.waitForLoadState('load');

    // Verificar que o FAB está posicionado à esquerda do "Voltar ao topo"
    // FAB right (desktop padrão): 72px; "Voltar ao topo" right: 28px, width: 36px → left edge: 64px
    // FAB ? ocupa right: 72px a right: 116px — não sobrepõe o "Voltar ao topo"
    const fabRight = await page.evaluate(() => {
      const fab = document.getElementById('help-fab');
      if (!fab) return 0;
      const style = getComputedStyle(fab);
      return parseInt(style.right, 10);
    });
    // FAB right deve ser >= 64px (left edge do botão "Voltar ao topo") para não sobrepor
    expect(fabRight).toBeGreaterThanOrEqual(64);
  });

});
