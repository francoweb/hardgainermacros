/**
 * Manifesto explícito dos alimentos que possuem ilustração final em
 * assets/images/foods/{foodId}.webp.
 *
 * Mantido separado de FOODS para evitar duplicar dados nutricionais ou nomes
 * visíveis. Serve apenas para prevenir requests inválidas no plano.
 */

export const FOOD_IMAGE_IDS = new Set([
  'abacate',
  'abobrinha',
  'arroz_branco_cozido',
  'aveia_flocos',
  'azeite',
  'banana_prata',
  'batata_cozida',
  'batata_doce_cozida',
  'brocolis',
  'cacau_po',
  'canela',
  'carne_moida',
  'cuscuz',
  'feijao_carioca',
  'iogurte_grego',
  'leite_integral',
  'maca',
  'macarrao_cozido',
  'manga',
  'mel',
  'molho_tomate',
  'ovo_inteiro',
  'pao_frances',
  'pasta_amendoa',
  'pasta_amendoim',
  'peito_frango',
  'peixe_pescada',
  'peixe_tilapia',
  'pure_batata',
  'queijo_branco',
  'salada_mista',
  'tapioca',
  'whey',
]);

export function hasFoodImage(foodId) {
  return typeof foodId === 'string' && FOOD_IMAGE_IDS.has(foodId.trim());
}
