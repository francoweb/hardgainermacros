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
  'atum_agua',
  'aveia_flocos',
  'azeite',
  'banana_prata',
  'batata_cozida',
  'batata_doce_cozida',
  'bebida_amendoa',
  'bebida_aveia',
  'brocolis',
  'cacau_po',
  'canela',
  'carne_moida',
  'clara_ovo',
  'coxa_frango',
  'cuscuz',
  'feijao_carioca',
  'iogurte_grego',
  'leite_integral',
  'leite_po',
  'mass_gainer',
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
  'peito_peru',
  'peixe_pescada',
  'peixe_salmao',
  'peixe_tilapia',
  'pure_batata',
  'queijo_branco',
  'queijo_cottage',
  'salada_mista',
  'sardinha_lata',
  'skyr',
  'tapioca',
  'whey',
]);

export function hasFoodImage(foodId) {
  return typeof foodId === 'string' && FOOD_IMAGE_IDS.has(foodId.trim());
}
