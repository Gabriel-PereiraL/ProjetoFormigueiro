/**
 * slotValidations.ts
 * ─────────────────────────────────────────────────────────────
 * Funções reutilizáveis de validação de regras de negócio
 * para slots e agendamentos.
 *
 * NUNCA dependa do frontend para estas validações.
 * Todo request chega aqui antes de tocar o banco.
 */

// ── Horários permitidos ───────────────────────────────────────

/** HH:MM dos slots válidos em dias de semana */
const WEEKDAY_ALLOWED_TIMES: string[] = [
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
];

/** Horários extras liberados apenas em finais de semana */
const WEEKEND_EXTRA_TIMES: string[] = ['16:30', '17:00'];

/** Todos os horários permitidos em finais de semana */
const WEEKEND_ALLOWED_TIMES: string[] = [
  ...WEEKDAY_ALLOWED_TIMES,
  ...WEEKEND_EXTRA_TIMES,
];

/** Horários do período da manhã */
const MORNING_TIMES: string[] = ['09:30', '10:00', '10:30', '11:00', '11:30'];

/** Horários do período da tarde (inclui extras de fim de semana) */
const AFTERNOON_TIMES: string[] = [
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
];

// ── Helpers internos ──────────────────────────────────────────

/**
 * Extrai HH:MM de um Date considerando UTC.
 * Os horários no banco são armazenados em UTC; compare sempre em UTC.
 */
function toHHMM(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ── Funções públicas ──────────────────────────────────────────

/**
 * Verifica se a data informada cai em um final de semana (UTC).
 * Sábado = 6, Domingo = 0.
 */
export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * Verifica se um horário HH:MM está na lista de horários permitidos
 * para o dia da semana correspondente à data fornecida.
 *
 * @param time  - string "HH:MM" extraída do startTime
 * @param date  - a mesma data do slot (para detectar fim de semana)
 */
export function isAllowedSlotTime(time: string, date: Date): boolean {
  const allowed = isWeekend(date) ? WEEKEND_ALLOWED_TIMES : WEEKDAY_ALLOWED_TIMES;
  return allowed.includes(time);
}

/**
 * Verifica se um horário HH:MM está dentro do bloqueio de almoço.
 * Horário bloqueado: 12:00 ≤ time < 13:00 (ou seja, 12:xx).
 * Nenhum slot ou booking pode existir neste intervalo.
 */
export function isLunchBreak(time: string): boolean {
  const [hours] = time.split(':').map(Number);
  return hours === 12;
}

/**
 * Verifica se um slot já expirou com base no horário atual do servidor.
 *
 * Um slot está expirado quando:
 *   - a data do slot é anterior a hoje, OU
 *   - a data do slot é hoje E o startTime já passou
 *
 * @param startTime - DateTime do slot (armazenado em UTC)
 * @param now       - momento atual (default: new Date()) — injetável para testes
 */
export function isExpiredSlot(startTime: Date, now: Date = new Date()): boolean {
  // Compara direto em milissegundos UTC — sem ambiguidade de timezone
  return startTime.getTime() <= now.getTime();
}

/**
 * Valida se o período (manhã/tarde) de um slot é coerente
 * com o horário informado.
 *
 * Retorna:
 *   - 'morning'   — slot válido de manhã
 *   - 'afternoon' — slot válido de tarde
 *   - null        — horário não pertence a nenhum período válido
 */
export function validateSlotPeriod(time: string): 'morning' | 'afternoon' | null {
  if (MORNING_TIMES.includes(time)) return 'morning';
  if (AFTERNOON_TIMES.includes(time)) return 'afternoon';
  return null;
}

// ── Objeto de resultado de validação ─────────────────────────

export interface SlotTimeValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
}

/**
 * Validação completa do startTime de um slot.
 * Aplica todas as regras de negócio em sequência.
 *
 * Uso: chame antes de criar um slot ou um booking.
 *
 * @param startTime - DateTime do slot (UTC)
 * @param now       - momento atual (injetável para testes unitários)
 */
export function validateSlotStartTime(
  startTime: Date,
  now: Date = new Date(),
): SlotTimeValidationResult {
  const time = toHHMM(startTime);

  // 1. Bloquear almoço
  if (isLunchBreak(time)) {
    return {
      valid: false,
      code: 'LUNCH_BREAK',
      message: `Horário ${time} está dentro do período de almoço bloqueado (12:00–13:00).`,
    };
  }

  // 2. Verificar se o horário está na whitelist
  if (!isAllowedSlotTime(time, startTime)) {
    const day = isWeekend(startTime) ? 'fim de semana' : 'dia de semana';
    return {
      valid: false,
      code: 'INVALID_SLOT_TIME',
      message: `Horário ${time} não é permitido em ${day}. Use um dos horários oficiais.`,
    };
  }

  // 3. Verificar período válido (manhã ou tarde — sem mistura)
  const period = validateSlotPeriod(time);
  if (!period) {
    return {
      valid: false,
      code: 'INVALID_PERIOD',
      message: `Horário ${time} não pertence a nenhum período válido (manhã ou tarde).`,
    };
  }

  // 4. Verificar se o slot já expirou
  if (isExpiredSlot(startTime, now)) {
    return {
      valid: false,
      code: 'SLOT_EXPIRED',
      message: `O horário ${startTime.toISOString()} já passou. Não é possível criar ou reservar slots expirados.`,
    };
  }

  return { valid: true };
}
