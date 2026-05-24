// @ts-check
'use strict';

/**
 * inject-state.js
 *
 * Injeta um cenário de fixture no localStorage e sessionStorage antes de
 * a SPA renderizar, simulando um utilizador que completou os formulários.
 *
 * Uso:
 *   await injectState(page, cenario);
 *   await gotoResultados(page);
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ form: object, profile: object, routine: object, results: object }} state
 */
async function injectState(page, state) {
  // addInitScript é executado antes de cada page.goto() — injeta
  // localStorage e sessionStorage antes de a app inicializar.
  await page.addInitScript((s) => {
    const PRE = 'hg:';

    // localStorage — dados persistentes (partilhados entre sesssões)
    localStorage.setItem(PRE + 'form',    JSON.stringify(s.form));
    localStorage.setItem(PRE + 'profile', JSON.stringify(s.profile));
    localStorage.setItem(PRE + 'routine', JSON.stringify(s.routine));
    localStorage.setItem(PRE + 'results', JSON.stringify(s.results));

    // sessionStorage — flags de progresso (bypassam os guards de rota)
    sessionStorage.setItem(PRE + 's:step1',   JSON.stringify(true));
    sessionStorage.setItem(PRE + 's:step2',   JSON.stringify(true));
    sessionStorage.setItem(PRE + 's:step3',   JSON.stringify(true));
    sessionStorage.setItem(PRE + 's:results', JSON.stringify(true));
  }, state);
}

/**
 * Navega para /resultados usando SPA routing.
 *
 * Começa em / (sempre acessível) e despacha um PopStateEvent para que o
 * router do cliente resolva /resultados — evita o 404 em servidores que
 * não fazem rewrite de rotas SPA.
 *
 * @param {import('@playwright/test').Page} page
 */
async function gotoResultados(page) {
  await page.goto('/');
  await page.waitForLoadState('load');  // 'networkidle' bloqueia com Live Server WebSocket
  await page.evaluate(() => {
    history.pushState({}, '', '/resultados');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  // Aguarda o primeiro bloco de refeição aparecer
  await page.waitForSelector('.meal-row', { timeout: 10_000 });
}

/**
 * A partir da página /resultados já carregada, clica no botão do plano
 * e aguarda a navegação SPA para /plano-14-dias.
 *
 * @param {import('@playwright/test').Page} page
 */
async function gotoPlano(page) {
  await page.getByText('Ver Plano Alimentar de 14 Dias').click();
  await page.waitForURL('**/plano-14-dias', { timeout: 10_000 });
}

module.exports = { injectState, gotoResultados, gotoPlano };
