# Hardgainer Macros

Calculadora especializada para ectomorfos, companheira do ebook **"Alimentação Híbrida para Hardgainers"** de Marco Franco ([@marcofrancooficial](https://www.instagram.com/marcofrancooficial)).

Single-page app em HTML/CSS/JavaScript puro — **sem build step**, **sem backend**, **sem dependências externas** exceto Google Fonts. Os dados do utilizador nunca saem do dispositivo.

---

## ✨ Funcionalidades

- **Cálculo nutricional preciso** via Mifflin-St Jeor + superávit calibrado por perfil
- **5 etapas guiadas**: Dados Físicos → Perfil → Rotina → Resultados → Plano de 14 Dias
- **Perfil "Falso Magro / Magro com Barriga"** com lógica dedicada (superávit controlado, mais proteína, escolhas de alimentos estratégicas)
- **Plano de 14 dias** gerado automaticamente seguindo o Sistema Híbrido (3 refeições sólidas + 3 shakes anabólicos)
- **Substituição inteligente de ingredientes** preservando calorias e macros
- **Lista de compras semanal** agregada por categoria
- **Impressão / exportação para PDF** via browser (estilos `@media print` otimizados)
- **Rotas protegidas** (sessionStorage) — impossível abrir `/resultados` sem completar as etapas
- **Persistência local** (localStorage) — o utilizador pode retomar depois
- **Banner de cookies** conforme RGPD
- **Páginas legais** completas (Política de Privacidade, Termos de Uso, Contato)

---

## 🗂 Estrutura do projeto

```
hardgainer-macros/
├── index.html                  ← shell da app (mount points)
├── 404.html                    ← fallback SPA para GitHub Pages
├── netlify.toml                ← config Netlify (SPA redirects + headers)
├── vercel.json                 ← config Vercel (SPA rewrites)
├── _redirects                  ← fallback alternativo para Netlify/Cloudflare
├── README.md
└── assets/
    ├── css/
    │   └── styles.css          ← design system completo (terracotta + cream)
    └── js/
        ├── app.js              ← entry point / orchestrator
        ├── data/
        │   ├── foods.js        ← base de dados nutricional (~40 alimentos, USDA/TACO/INSA)
        │   └── meal-templates.js  ← templates de refeições (café, almoço, jantar, 6 tipos de shake)
        ├── modules/
        │   ├── calculator.js   ← TMB, TDEE, superávit, macros, distribuição por slot
        │   ├── meal-planner.js ← gerador do plano de 14 dias
        │   ├── router.js       ← SPA router com route guards
        │   ├── storage.js      ← abstração localStorage/sessionStorage
        │   └── icons.js        ← biblioteca de ícones SVG
        ├── components/
        │   └── ui.js           ← header, footer, stepper, cookie banner, modal
        └── pages/
            ├── dados-fisicos.js   ← Etapa 1 (home)
            ├── perfil.js          ← Etapa 2
            ├── rotina.js          ← Etapa 3
            ├── resultados.js      ← Etapa 4
            ├── plano-14-dias.js   ← Etapa 5
            └── legal.js           ← /politica-de-privacidade, /termos-de-uso, /contato
```

---

## 🚀 Deploy

### Opção 1 — Netlify (recomendado para início rápido)

**Drag & drop:**
1. Vá a [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arraste a pasta `hardgainer-macros` inteira para a área de upload
3. Pronto — a app fica online em `https://random-name.netlify.app`

**Via GitHub:**
1. Faça push do repositório para o GitHub
2. Em [app.netlify.com](https://app.netlify.com), New site → Import from Git
3. Escolha o repositório. O `netlify.toml` já está configurado — nada a preencher
4. Deploy

### Opção 2 — Vercel

1. Faça push para o GitHub
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório
3. O `vercel.json` já está configurado
4. Deploy (sem necessidade de build command)

### Opção 3 — GitHub Pages

1. Ative Pages nas Settings do repositório
2. Escolha a branch `main` e a pasta `/` (root)
3. O `404.html` incluído faz o fallback necessário para rotas como `/resultados` funcionarem em SPA

### Opção 4 — Cloudflare Pages

1. Connect to Git → escolha o repositório
2. Build output: `/` (root). Sem build command
3. O `_redirects` já está configurado

### Opção 5 — Qualquer servidor estático

A app é **100% estática**. Basta servir a pasta com qualquer servidor HTTP e configurar o fallback para SPA (todas as URLs desconhecidas devem devolver `index.html` com status 200).

**nginx** exemplo:
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Apache (`.htaccess`)** exemplo:
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## 🧪 Rodar localmente

A app usa ES modules — precisa de um servidor HTTP (não abra `index.html` via `file://`, pois módulos ES requerem origem HTTP).

**Opção A — Python (pré-instalado em Linux/Mac):**
```bash
cd hardgainer-macros
python3 -m http.server 8000
# abrir http://localhost:8000
```

**Opção B — Node:**
```bash
cd hardgainer-macros
npx serve .
# ou
npx http-server -p 8000
```

**Opção C — VS Code:**
Instale a extensão "Live Server" → clique direito em `index.html` → "Open with Live Server".

---

## 🧠 Sobre os cálculos

- **TMB (Metabolismo Basal):** Mifflin-St Jeor Equation (1990, a fórmula mais precisa segundo a ADA)
- **TDEE:** TMB × fator de atividade (1.35 sedentário → 1.95 extremamente ativo)
- **Superávit:** 350 kcal (controlado) / 550 kcal (moderado) / 800 kcal (agressivo), ajustado por perfil
- **Perfil Falso Magro:** superávit reduzido em 250 kcal, proteína 2.2 g/kg (vs 2.0), gordura 0.9 g/kg (vs 1.0)
- **Macros:** proteína (2.0–2.2 g/kg) + gordura (0.9–1.2 g/kg) + carboidratos preenchem o resto
- **Distribuição por refeição:** 60/40 sólido/shake (híbrido), 70/30 (sólido), 45/55 (praticidade)

---

## 🍽 Base de dados nutricional

Valores por 100 g/100 ml de fontes oficiais:

- **USDA FoodData Central** (primário)
- **TACO — Tabela Brasileira de Composição de Alimentos / UNICAMP** (alimentos regionais)
- **INSA — Tabela Portuguesa de Composição de Alimentos** (produção europeia)
- **Rótulos oficiais** de fabricantes reconhecidos (whey, aveias comerciais)

Cada alimento traz o campo `source` identificando a fonte usada.

---

## 🔒 Privacidade

- **Nada sai do dispositivo.** Não há servidor de aplicação, analytics, trackers ou píxeis.
- `localStorage` guarda apenas os dados que o utilizador preencheu (pode ser limpo a qualquer momento).
- `sessionStorage` guarda sinalizadores de progresso da sessão atual (apagados ao fechar o browser).
- O banner de cookies serve apenas para registar o consentimento ao armazenamento local descrito acima.

---

## 📜 Licença e uso

Cálculos, textos, receitas e design © Marco Franco. O código da calculadora é uso restrito ao projeto oficial Hardgainer Macros. Para parcerias, DM no Instagram [@marcofrancooficial](https://www.instagram.com/marcofrancooficial).

---

**Disclaimer:** Esta ferramenta é educativa e não substitui acompanhamento médico ou nutricional profissional. Consulte um profissional de saúde antes de alterações significativas na sua alimentação, especialmente se tem condições médicas.
