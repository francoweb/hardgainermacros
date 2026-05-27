/**
 * day-schedule — utilitários partilhados de agendamento/nomeação
 *
 * Exporta apenas o necessário para evitar duplicação entre páginas.
 * Não contém lógica de horários — isso vive em rebuildTimesAroundTraining (resultados.js).
 */

export const SLOT_LABEL = {
  breakfast: 'Café da Manhã',
  shake_morning: 'Shake Bomba Calórica',
  lunch: 'Almoço',
  shake_afternoon: 'Shake Energia Instantânea',
  dinner: 'Jantar',
  shake_night: 'Shake Crescimento Noturno',
  shake_extra: 'Shake Extra',
  shake_extra2: 'Shake Extra 2',
  pre_workout_light: 'Shake Pré-Treino Leve',
  post_workout_night: 'Shake Pós-Treino Leve Antes de Dormir',
};

/**
 * Recebe um array de slots que já têm `displayLabel` (string | null) e devolve
 * o mesmo array com `displayLabel` deduplicado:
 *   - 2.º "Almoço"          → "Refeição da Tarde"
 *   - 2.º "Café da Manhã"   → "Lanche da Manhã"
 *   - 2.º "Refeição da Tarde" → "Refeição Pré-Treino"
 *
 * Slots com displayLabel null (ex: bloco __train__) são passados sem alteração.
 *
 * @param {Array<Object>} slots  — cada slot deve ter pelo menos { displayLabel }
 * @returns {Array<Object>}      — mesmos slots com displayLabel final
 */
export function applyDedupLabels(slots, { hasTraining = true, trainStartTime = null } = {}) {
  const seen = {};
  const emitted = {};
  // F2: converte HH:MM → minutos. Usado para verificar proximidade ao treino.
  const _toM = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const tStart = trainStartTime ? _toM(trainStartTime) : null;
  return slots.map(slot => {
    const label = slot.displayLabel;
    if (!label) return slot;
    seen[label] = (seen[label] || 0) + 1;
    let out = label;
    if (label === 'Almoço'        && seen[label] > 1) out = 'Refeição da Tarde';
    if (label === 'Café da Manhã' && seen[label] > 1) out = 'Lanche da Manhã';
    if (label === 'Jantar'        && seen[label] > 1) out = 'Refeição de Fim de Dia';
    emitted[out] = (emitted[out] || 0) + 1;
    if (out === 'Refeição da Tarde' && emitted[out] > 1) {
      // F2: só promove a "Refeição Pré-Treino" se o slot estiver dentro de 180 min antes do treino.
      // Fora desse intervalo usa "Lanche da Tarde" para evitar label enganoso.
      const slotMin = slot.time ? _toM(slot.time) : null;
      const nearTraining = hasTraining && tStart !== null && slotMin !== null
        && (tStart - slotMin) >= 0 && (tStart - slotMin) <= 180;
      out = nearTraining ? 'Refeição Pré-Treino' : 'Lanche da Tarde';
    }
    return { ...slot, displayLabel: out };
  });
}
