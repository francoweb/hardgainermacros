/**
 * PAGES — Legais (/politica-de-privacidade, /termos-de-uso, /contato)
 * =============================================================================
 * São páginas estáticas, sem router-protection. Não alteram progresso de sessão.
 * =============================================================================
 */

import { icons } from '../modules/icons.js';
import { navigate } from '../modules/router.js';

/* ========================================================================= */
/* Privacy Policy                                                             */
/* ========================================================================= */
export function renderPrivacyPage(mount) {
  mount.innerHTML = `
    <div class="container">
      <div class="legal" style="padding: 36px clamp(20px, 5vw, 44px) 48px;">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Política de Privacidade</h1>
        <p class="legal-meta">Última atualização: ${formatToday()}</p>

        <section class="legal-section">
          <h2>1. Quem somos</h2>
          <p>A Hardgainer Macros é uma calculadora online gratuita de apoio ao protocolo "<a href="https://hardgainerhibrido.com/" target="_blank" rel="noopener">Alimentação Híbrida para Hardgainers</a>", desenvolvida por Marco Franco (<a href="https://www.instagram.com/marcofrancooficial" target="_blank" rel="noopener">@marcofrancooficial</a>). Marco Franco é o responsável por esta ferramenta e por esta política.</p>
        </section>

        <section class="legal-section">
          <h2>2. Dados que coletamos</h2>
          <p>Para calcular suas necessidades calóricas, você preenche diretamente no navegador:</p>
          <ul>
            <li>Sexo biológico, idade, peso, altura</li>
            <li>Nível de atividade, dificuldade principal, objetivo</li>
            <li>Rotina de treino e preferências alimentares</li>
            <li>Substituições de ingredientes no plano de 14 dias</li>
          </ul>
          <p><strong>Esses dados não são enviados a nenhum servidor desta ferramenta.</strong> São armazenados apenas no seu próprio dispositivo.</p>
          <p>Ferramentas de terceiros que possam estar integradas ao site (analytics, publicidade) podem coletar dados de uso e dados técnicos do dispositivo de forma independente, conforme descrito nas seções 5 e 6.</p>
        </section>

        <section class="legal-section">
          <h2>3. Como armazenamos</h2>
          <p>Usamos duas tecnologias nativas do próprio navegador:</p>
          <ul>
            <li><strong>localStorage</strong> — armazena seus dados de formulário e o plano gerado para que você possa retomar em outra visita.</li>
            <li><strong>sessionStorage</strong> — armazena apenas indicadores de progresso da sessão atual. São apagados automaticamente ao fechar o navegador.</li>
          </ul>
          <p>Você pode apagar tudo clicando no ícone de reset no topo da ferramenta ou limpando o cache do seu navegador.</p>
        </section>

        <section class="legal-section">
          <h2>4. Cookies e tecnologias semelhantes</h2>
          <p>A ferramenta em si não define cookies próprios de rastreamento. O banner que aparece ao entrar registra sua preferência sobre o armazenamento local descrito na seção 3.</p>
          <p>O site poderá integrar ferramentas de terceiros que utilizam cookies, pixels, identificadores de dispositivo ou tecnologias similares para analytics, publicidade ou medição de desempenho. Tecnologias não essenciais podem depender do seu consentimento antes de serem ativadas, quando aplicável. Você pode gerenciar suas preferências pelo banner de cookies ou pelas configurações do seu navegador.</p>
        </section>

        <section class="legal-section">
          <h2>5. Analytics, publicidade e ferramentas de terceiros</h2>
          <p>O site poderá utilizar ferramentas como Google Analytics, Google AdSense ou outras plataformas de publicidade e medição. Essas ferramentas podem:</p>
          <ul>
            <li>Coletar dados de uso e navegação para análise de desempenho do site</li>
            <li>Exibir anúncios personalizados ou não personalizados, conforme suas configurações, consentimento e requisitos aplicáveis</li>
            <li>Usar pixels, cookies e identificadores para medir resultados, gerar relatórios e prevenir fraudes</li>
            <li>Compartilhar dados com parceiros de tecnologia conforme suas próprias políticas</li>
          </ul>
          <p>Cada fornecedor opera sob a sua própria política de privacidade. Para o Google, consulte <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">policies.google.com/privacy</a>.</p>
        </section>

        <section class="legal-section">
          <h2>6. Compartilhamento de dados</h2>
          <p>Os dados que você insere na calculadora ficam no seu dispositivo e não são enviados nem compartilhados por esta ferramenta com terceiros.</p>
          <p>Ferramentas de terceiros eventualmente integradas (analytics, publicidade, medição) podem coletar e processar dados de forma independente, de acordo com suas próprias políticas de privacidade. Não temos controle sobre como esses fornecedores tratam os dados que coletam diretamente.</p>
        </section>

        <section class="legal-section">
          <h2>7. Seus direitos</h2>
          <p>Você tem direito a acessar, corrigir, apagar ou exportar seus dados pessoais. Como os dados da calculadora ficam no seu próprio dispositivo, você pode exercer esses direitos diretamente — o botão de reset apaga tudo, e você pode inspecionar o localStorage nas ferramentas de desenvolvimento do navegador.</p>
          <p>Para dados tratados por terceiros (analytics, publicidade), os direitos devem ser exercidos diretamente junto a esses fornecedores, conforme suas políticas.</p>
        </section>

        <section class="legal-section">
          <h2>8. Crianças</h2>
          <p>A ferramenta não se destina a menores de 14 anos. A validação de idade começa em 14 e qualquer uso por crianças deve ser acompanhado por um adulto responsável.</p>
        </section>

        <section class="legal-section">
          <h2>9. Alterações desta política</h2>
          <p>Esta política pode ser atualizada periodicamente para refletir mudanças nas práticas da ferramenta ou por exigências legais. A versão em vigor é sempre a que consta nesta página, com a data de atualização indicada no topo.</p>
        </section>

        <section class="legal-section">
          <h2>10. Contato</h2>
          <p>Dúvidas sobre privacidade ou sobre como seus dados são tratados? Entre em contato:</p>
          <ul>
            <li>Email: <a href="mailto:hardgainerhibrido@gmail.com">hardgainerhibrido@gmail.com</a></li>
            <li>Instagram: <a href="https://www.instagram.com/marcofrancooficial" target="_blank" rel="noopener">@marcofrancooficial</a></li>
          </ul>
        </section>
      </div>
    </div>
  `;
}

/* ========================================================================= */
/* Terms of Use                                                               */
/* ========================================================================= */
export function renderTermsPage(mount) {
  mount.innerHTML = `
    <div class="container">
      <div class="legal" style="padding: 36px clamp(20px, 5vw, 44px) 48px;">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Termos de Uso</h1>
        <p class="legal-meta">Última atualização: ${formatToday()}</p>

        <section class="legal-section">
          <h2>1. Aceitação</h2>
          <p>Ao utilizar a Hardgainer Macros concorda com estes Termos de Uso. Se não concorda, não utilize a ferramenta.</p>
        </section>

        <section class="legal-section">
          <h2>2. Natureza do serviço</h2>
          <p>A Hardgainer Macros é uma ferramenta educativa que calcula estimativas nutricionais baseadas em fórmulas científicas estabelecidas (Mifflin-St Jeor) e tabelas oficiais de composição alimentar (USDA, TACO, INSA). É uma <strong>companheira do protocolo "<a href="https://hardgainerhibrido.com/" target="_blank" rel="noopener">Alimentação Híbrida para Hardgainers</a>"</strong> — não uma consulta de nutrição clínica.</p>
        </section>

        <section class="legal-section">
          <h2>3. Limitações médicas</h2>
          <div class="alert" style="margin: 12px 0;">
            <span class="alert-icon">${icons.alertTri(18)}</span>
            <div>
              <strong>Esta ferramenta não substitui acompanhamento profissional.</strong>
              Consulte um médico ou nutricionista antes de mudanças significativas na sua alimentação, especialmente se tem condições médicas, alergias, intolerâncias ou toma medicação.
            </div>
          </div>
          <p>As quantidades e sugestões apresentadas são médias estatísticas — a sua resposta individual pode variar significativamente. Se sente mal-estar digestivo, cansaço excessivo ou outras alterações, pare de seguir o plano e procure orientação profissional.</p>
        </section>

        <section class="legal-section">
          <h2>4. Condições excluídas</h2>
          <p>A ferramenta não foi desenhada para:</p>
          <ul>
            <li>Pessoas com diabetes tipo 1 ou 2, doenças renais ou hepáticas</li>
            <li>Grávidas ou lactantes</li>
            <li>Utilizadores com transtornos alimentares ativos ou em recuperação</li>
            <li>Preparações de competição culturista (que exigem periodização específica)</li>
            <li>Menores de 14 anos</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>5. Propriedade intelectual</h2>
          <p>Os cálculos, textos, design, fórmulas de combinação de alimentos e receitas são propriedade do autor e do Sistema de <a href="https://hardgainerhibrido.com/" target="_blank" rel="noopener">Alimentação Híbrida para Hardgainers</a>. Pode usar os resultados para si — não os pode redistribuir, revender ou incorporar noutras apps sem autorização expressa.</p>
        </section>

        <section class="legal-section">
          <h2>6. Responsabilidade</h2>
          <p>O serviço é fornecido "tal como está". Não nos responsabilizamos por eventuais danos decorrentes de uso indevido, nem pela exatidão absoluta dos cálculos — os valores devem ser entendidos como ponto de partida a ajustar consoante a sua resposta individual.</p>
        </section>

        <section class="legal-section">
          <h2>7. Alterações</h2>
          <p>Podemos atualizar estes termos sempre que necessário. A versão em vigor é sempre a que consta nesta página.</p>
        </section>
      </div>
    </div>
  `;
}

/* ========================================================================= */
/* Contact                                                                    */
/* ========================================================================= */
export function renderContactPage(mount) {
  mount.innerHTML = `
    <div class="container">
      <div class="legal" style="padding: 36px clamp(20px, 5vw, 44px) 48px;">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Entre em Contato</h1>

        <p style="margin: 16px 0 28px; line-height: 1.75; color: var(--ink-soft);">
          Se você encontrou um erro, quer sugerir uma melhoria ou tem alguma dúvida sobre a calculadora, sobre o plano de 14 dias ou sobre o Sistema de Alimentação Híbrida, pode entrar em contato pelos canais abaixo.
        </p>

        <section class="legal-section">
          <h2>Você pode falar comigo sobre:</h2>
          <ul>
            <li>Erros ou bugs na ferramenta</li>
            <li>Sugestões de melhoria</li>
            <li>Dúvidas sobre cálculos e resultados</li>
            <li>Dúvidas relacionadas ao plano de 14 dias</li>
            <li>Dúvidas relacionadas ao Sistema de Alimentação Híbrida</li>
            <li>Problemas de navegação ou funcionamento</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>Para receber resposta mais rápido, envie:</h2>
          <ul>
            <li>Uma descrição clara do problema ou dúvida</li>
            <li>A página onde isso aconteceu</li>
            <li>O que você estava fazendo antes</li>
            <li>Print, se possível</li>
            <li>Se está no computador ou no celular</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>Canais de contato</h2>
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
            <div style="display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-md); flex-wrap: wrap;">
              <span style="font-weight: 600; color: var(--ink); white-space: nowrap;">Email</span>
              <a href="mailto:hardgainerhibrido@gmail.com" style="color: var(--accent); font-weight: 500; word-break: break-all;">hardgainerhibrido@gmail.com</a>
            </div>
            <a href="https://www.instagram.com/marcofrancooficial" target="_blank" rel="noopener"
               style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--accent); border-radius: var(--r-md); color: #fff; font-weight: 600; text-decoration: none;">
              ${icons.user(16)}
              <span>Instagram: @marcofrancooficial</span>
            </a>
          </div>
        </section>

        <div class="hint" style="margin-top: 8px;">
          <span class="hint-icon">${icons.info(16)}</span>
          <div>Quanto mais clara e direta for a sua mensagem, mais rápido fica ajudar você.</div>
        </div>
      </div>
    </div>
  `;
}

/* ========================================================================= */
/* Helpers                                                                    */
/* ========================================================================= */
function formatToday() {
  const d = new Date();
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}
