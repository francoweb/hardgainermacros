/**
 * Vercel Serverless Function — Leitura de rótulo nutricional via Gemini Vision
 * =============================================================================
 * POST /api/read-nutrition-label
 * Body: { "image": "<base64 puro, sem prefixo data:image/...>" }
 *
 * A GEMINI_API_KEY é lida de process.env — NUNCA hardcoded.
 * Configurar em Vercel → Settings → Environment Variables.
 * =============================================================================
 */

const GEMINI_MODEL    = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  'https://www.hardgainermacros.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PROMPT_TEXT =
  'Analise esta imagem de uma tabela nutricional de um produto alimentício. ' +
  'Extraia todos os valores nutricionais visíveis e retorne APENAS um JSON válido, ' +
  'sem texto adicional, sem markdown, sem explicações. ' +
  'Formato obrigatório: {"per100g": {"kcal": number|null, "prot": number|null, ' +
  '"carb": number|null, "fat": number|null, "sugar": number|null, "fiber": number|null, ' +
  '"saturated": number|null, "mono": number|null, "poly": number|null, "trans": number|null, ' +
  '"salt": number|null, "sodium": number|null, "cholesterol": number|null, ' +
  '"vitA": number|null, "vitC": number|null, "vitD": number|null, "vitE": number|null, ' +
  '"vitB1": number|null, "vitB2": number|null, "vitB3": number|null, "vitB6": number|null, ' +
  '"vitB12": number|null, "calcium": number|null, "iron": number|null, ' +
  '"magnesium": number|null, "potassium": number|null, "zinc": number|null}, ' +
  '"confidence": "alta"|"media"|"baixa", "produto_nome": string|null}. ' +
  'Regras: (1) Todos os valores DEVEM ser por 100g ou 100ml — se a tabela mostrar por porção, ' +
  'converte proporcionalmente. (2) Use null para qualquer campo não visível ou ilegível. ' +
  '(3) NUNCA invente valores — prefira null a um valor incerto. ' +
  '(4) confidence é "alta" se a imagem estiver nítida e a tabela completa, ' +
  '"media" se parcialmente legível, "baixa" se houver dúvida significativa em vários campos. ' +
  '(5) produto_nome deve ser o nome do produto se visível na embalagem, senão null.';

function respond(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  // ── Debug temporário — remover após diagnóstico ─────────────────────────────
  console.log('GEMINI_DEBUG: função chamada, método:', req.method);
  console.log('GEMINI_DEBUG: GEMINI_API_KEY presente:', !!process.env.GEMINI_API_KEY);
  console.log('GEMINI_DEBUG: body keys:', Object.keys(req.body || {}));
  // ────────────────────────────────────────────────────────────────────────────

  // CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Método não permitido.' });
  }

  // Validar Content-Type
  if (!req.headers['content-type']?.includes('application/json')) {
    return respond(res, 400, { error: 'Content-Type inválido.' });
  }

  // Validar body
  const { image } = req.body || {};
  if (!image || typeof image !== 'string') {
    return respond(res, 400, { error: 'Imagem em falta.' });
  }
  if (image.length > 6_000_000) {
    return respond(res, 413, { error: 'Imagem demasiado grande. Use uma foto com menos de 4MB.' });
  }

  // Validar chave de API
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[read-nutrition-label] GEMINI_API_KEY não configurada');
    return respond(res, 500, { error: 'Serviço não configurado. Contacte o suporte.' });
  }

  // Chamar Gemini Vision
  let geminiRes;
  try {
    geminiRes = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT_TEXT },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
    });
  } catch (networkErr) {
    console.error('[read-nutrition-label] Erro de rede:', networkErr.message);
    return respond(res, 502, { error: 'Serviço temporariamente indisponível. Tente novamente.' });
  }

  if (!geminiRes.ok) {
    const errBody = await geminiRes.text().catch(() => '');
    console.error('[read-nutrition-label] Gemini HTTP', geminiRes.status, errBody.slice(0, 200));
    return respond(res, 502, { error: 'Não foi possível processar a imagem. Tente novamente.' });
  }

  // Extrair e validar JSON da resposta
  let geminiJson;
  try {
    geminiJson = await geminiRes.json();
  } catch {
    return respond(res, 502, { error: 'Resposta inválida do serviço de visão.' });
  }

  const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    console.error('[read-nutrition-label] Resposta sem texto:', JSON.stringify(geminiJson).slice(0, 200));
    return respond(res, 502, { error: 'Resposta inválida do serviço de visão.' });
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error('[read-nutrition-label] JSON inválido do Gemini:', rawText.slice(0, 200));
    return respond(res, 502, { error: 'Resposta inválida do serviço de visão.' });
  }

  if (!parsed.per100g || !parsed.confidence) {
    console.error('[read-nutrition-label] Estrutura inesperada:', JSON.stringify(parsed).slice(0, 200));
    return respond(res, 502, { error: 'Resposta inválida do serviço de visão.' });
  }

  return respond(res, 200, parsed);
};
