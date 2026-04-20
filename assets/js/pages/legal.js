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
      <div class="legal">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Política de Privacidade</h1>
        <p class="legal-meta">Última atualização: ${formatToday()}</p>

        <section class="legal-section">
          <h2>1. Quem somos</h2>
          <p>A Hardgainer Macros é uma calculadora online gratuita de apoio ao ebook "Alimentação Híbrida para Hardgainers", desenvolvida por Marco Franco (<a href="https://www.instagram.com/marcofrancooficial" target="_blank" rel="noopener">@marcofrancooficial</a>).</p>
        </section>

        <section class="legal-section">
          <h2>2. Dados que recolhemos</h2>
          <p>Para calcular as suas necessidades calóricas, recolhemos dentro do seu próprio navegador:</p>
          <ul>
            <li>Sexo biológico, idade, peso, altura</li>
            <li>Nível de atividade, dificuldade principal, objetivo</li>
            <li>Rotina de treino e preferências alimentares</li>
            <li>Substituições de ingredientes que aplicar no plano de 14 dias</li>
          </ul>
          <p><strong>Estes dados nunca saem do seu dispositivo.</strong> Não temos servidor de aplicação que os receba, guarde ou processe.</p>
        </section>

        <section class="legal-section">
          <h2>3. Como guardamos</h2>
          <p>Usamos duas tecnologias-padrão do próprio navegador:</p>
          <ul>
            <li><strong>localStorage</strong> — guarda os seus dados de formulário e plano gerado para poder retomar numa próxima visita.</li>
            <li><strong>sessionStorage</strong> — guarda apenas sinalizadores de progresso da sua sessão atual. Ao fechar o navegador, estes apagam-se automaticamente.</li>
          </ul>
          <p>Pode apagar tudo em qualquer momento clicando no ícone de reset no topo da app, ou limpando o cache do seu navegador.</p>
        </section>

        <section class="legal-section">
          <h2>4. Cookies e rastreio</h2>
          <p>Não usamos cookies de tracking, analytics de terceiros, píxeis de Facebook, Google Ads ou qualquer tecnologia de perfilação comportamental. O banner de cookies que aparece ao entrar serve apenas para registar a sua aceitação do armazenamento local descrito no ponto 3.</p>
        </section>

        <section class="legal-section">
          <h2>5. Partilha de dados</h2>
          <p>Como nada sai do seu dispositivo, não partilhamos dados com ninguém. Simples assim.</p>
        </section>

        <section class="legal-section">
          <h2>6. Os seus direitos (RGPD)</h2>
          <p>Ao abrigo do Regulamento Geral de Proteção de Dados (RGPD), tem direito a aceder, retificar, apagar ou exportar os seus dados pessoais. Como todos os dados estão no seu próprio dispositivo, pode exercer estes direitos diretamente — o botão de reset apaga tudo, e pode inspecionar o localStorage através das ferramentas de desenvolvimento do seu navegador.</p>
        </section>

        <section class="legal-section">
          <h2>7. Crianças</h2>
          <p>A app não se destina a menores de 14 anos. A validação de idade começa em 14 e qualquer uso por crianças deve ser acompanhado por um adulto responsável.</p>
        </section>

        <section class="legal-section">
          <h2>8. Contacto</h2>
          <p>Questões sobre privacidade? Contacte através do Instagram <a href="https://www.instagram.com/marcofrancooficial" target="_blank" rel="noopener">@marcofrancooficial</a>.</p>
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
      <div class="legal">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Termos de Uso</h1>
        <p class="legal-meta">Última atualização: ${formatToday()}</p>

        <section class="legal-section">
          <h2>1. Aceitação</h2>
          <p>Ao utilizar a Hardgainer Macros concorda com estes Termos de Uso. Se não concorda, não utilize a ferramenta.</p>
        </section>

        <section class="legal-section">
          <h2>2. Natureza do serviço</h2>
          <p>A Hardgainer Macros é uma ferramenta educativa que calcula estimativas nutricionais baseadas em fórmulas científicas estabelecidas (Mifflin-St Jeor) e tabelas oficiais de composição alimentar (USDA, TACO, INSA). É uma <strong>companheira do ebook "Alimentação Híbrida para Hardgainers"</strong> — não uma consulta de nutrição clínica.</p>
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
          <p>Os cálculos, textos, design, fórmulas de combinação de alimentos e receitas são propriedade do autor e do Sistema de Alimentação Híbrida para Hardgainers. Pode usar os resultados para si — não os pode redistribuir, revender ou incorporar noutras apps sem autorização expressa.</p>
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
      <div class="legal">
        <a href="/" data-route class="legal-back">${icons.arrowLeft(14)} Voltar ao início</a>
        <h1 class="hero-title">Contato</h1>
        <p class="hero-sub">Dúvidas sobre o ebook, bugs na calculadora ou sugestões</p>

        <div class="card" style="margin-top: 20px;">
          <div class="card-head">
            <h2 class="card-title">Fale Diretamente no Instagram</h2>
            <p class="card-sub">Este é o canal mais rápido para respostas</p>
          </div>
          <p class="card-body">
            A forma mais rápida de entrar em contato é via DM no Instagram:
          </p>
          <a class="btn btn-primary btn-large" href="https://www.instagram.com/marcofrancooficial" target="_blank" rel="noopener" style="margin-top: 12px;">
            ${icons.user(16)} @marcofrancooficial
          </a>
        </div>

        <div class="card" style="margin-top: 20px;">
          <div class="card-head">
            <h2 class="card-title">Formulário de Mensagem</h2>
            <p class="card-sub">Se preferir deixar uma mensagem escrita — ela abre o seu app de email</p>
          </div>

          <form id="f-contact" class="contact-form" novalidate>
            <div class="field">
              <label class="label" for="c-name">Nome</label>
              <input id="c-name" type="text" class="input input-no-icon" placeholder="Seu nome" />
              <div class="field-error" id="err-c-name"></div>
            </div>

            <div class="field">
              <label class="label" for="c-email">Email</label>
              <input id="c-email" type="email" class="input input-no-icon" placeholder="voce@exemplo.com" />
              <div class="field-error" id="err-c-email"></div>
            </div>

            <div class="field">
              <label class="label" for="c-subject">Assunto</label>
              <select id="c-subject" class="input input-no-icon">
                <option value="duvida">Dúvida sobre o ebook</option>
                <option value="calc">Problema na calculadora</option>
                <option value="sugestao">Sugestão de melhoria</option>
                <option value="outro">Outro assunto</option>
              </select>
            </div>

            <div class="field">
              <label class="label" for="c-message">Mensagem</label>
              <textarea id="c-message" class="input input-no-icon" rows="5" placeholder="Escreva a sua mensagem..."></textarea>
              <div class="field-error" id="err-c-message"></div>
            </div>

            <div class="hint" style="margin-bottom: 12px;">
              <span class="hint-icon">${icons.info(16)}</span>
              <div>
                Este formulário abre o seu app de email com a mensagem pré-preenchida — a app em si não tem servidor nem envia emails diretamente. Para resposta mais rápida, DM no Instagram.
              </div>
            </div>

            <div class="btn-row">
              <button type="submit" class="btn btn-primary">${icons.arrowRight(16)} Abrir no Email</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Form submit -> mailto:
  const form = document.getElementById('f-contact');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('c-name').value.trim();
    const email = document.getElementById('c-email').value.trim();
    const subject = document.getElementById('c-subject').value;
    const message = document.getElementById('c-message').value.trim();

    let ok = true;
    const setErr = (id, msg) => { document.getElementById(id).textContent = msg; if (msg) ok = false; };
    setErr('err-c-name', name.length >= 2 ? '' : 'Informe o seu nome.');
    setErr('err-c-email', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Email inválido.');
    setErr('err-c-message', message.length >= 10 ? '' : 'Mensagem muito curta (mínimo 10 caracteres).');
    if (!ok) return;

    const subjLabel = {
      duvida: 'Dúvida sobre o ebook',
      calc: 'Problema na calculadora',
      sugestao: 'Sugestão de melhoria',
      outro: 'Outro assunto',
    }[subject] || 'Contato';

    const body = `${message}\n\n---\nNome: ${name}\nEmail: ${email}`;
    const mailto = `mailto:contato@hardgainermacros.com?subject=${encodeURIComponent('[HardgainerMacros] ' + subjLabel)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
}

/* ========================================================================= */
/* Helpers                                                                    */
/* ========================================================================= */
function formatToday() {
  const d = new Date();
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
}
