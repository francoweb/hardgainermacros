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
  'alcatra_grelhada',
  'arroz_branco_cozido',
  'atum_agua',
  'aveia_flocos',
  'azeite',
  'banana_prata',
  'banha_porco',
  'batata_cozida',
  'batata_doce_cozida',
  'bebida_amendoa',
  'bebida_aveia',
  'brocolis',
  'cacau_po',
  'canela',
  'carne_moida',
  'caseina',
  'clara_ovo',
  'creme_leite',
  'coxa_frango',
  'cuscuz',
  'feijao_carioca',
  'iogurte_grego',
  'leite_integral',
  'leite_lactose_free',
  'leite_po',
  'lombo_porco',
  'mass_gainer',
  'maca',
  'macarrao_cozido',
  'manga',
  'mel',
  'molho_tomate',
  'manteiga',
  'oleo_coco',
  'ovo_inteiro',
  'pao_frances',
  'pasta_amendoa',
  'pasta_amendoim',
  'peito_frango',
  'peito_peru',
  'peixe_pescada',
  'peixe_salmao',
  'peixe_tilapia',
  'proteina_arroz',
  'proteina_ervilha',
  'pure_batata',
  'queijo_branco',
  'queijo_cottage',
  'queijo_mussarela',
  'salada_mista',
  'sardinha_lata',
  'sementes_chia',
  'skyr',
  'tapioca',
  'whey',
]);

export function hasFoodImage(foodId) {
  return typeof foodId === 'string' && FOOD_IMAGE_IDS.has(foodId.trim());
}
