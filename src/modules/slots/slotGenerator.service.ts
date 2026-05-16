/**
 * slotGenerator.service.ts
 * ─────────────────────────────────────────────────────────────
 * Geração automática de slots para um intervalo de datas.
 *
 * Regras de negócio:
 *  - Dias úteis  → 09:30–11:30 e 13:30–16:00 (sem 12:xx)
 *  - Fim de semana → os mesmos + 16:30 e 17:00
 *  - Cada slot dura 30 minutos
 *  - maxCapacity = 20, active = true, blockedForSchool = false
 *  - Nunca duplica (verifica @@unique [startTime, endTime])
 *  - Tudo em UTC
 *
 * CAMINHO: src/modules/slots/slotGenerator.service.ts
 */

import { prisma } from '../../config/database';
import { isWeekend } from '../../shared/utils/slotValidations';

// ── Constantes ────────────────────────────────────────────────

/** Horários de início (HH:MM UTC) válidos em dias úteis */
const WEEKDAY_START_TIMES: string[] = [
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

/** Horários extras exclusivos de fim de semana */
const WEEKEND_EXTRA_TIMES: string[] = ['16:30', '17:00'];

/** Duração de cada slot em minutos */
const SLOT_DURATION_MINUTES = 30;

/** Capacidade padrão */
const DEFAULT_MAX_CAPACITY = 20;

// ── Helpers internos ──────────────────────────────────────────

/**
 * Converte uma string "YYYY-MM-DD" em um objeto Date UTC
 * representando a meia-noite daquele dia.
 */
function parseDateUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

/**
 * Dado um Date UTC base (meia-noite do dia) e um horário "HH:MM",
 * retorna um novo Date UTC com aquele horário aplicado.
 */
function applyTimeUTC(base: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setUTCHours(hours!, minutes!, 0, 0);
  return d;
}

/**
 * Adiciona `minutes` minutos a um Date e retorna novo Date.
 */
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ── Tipos públicos ────────────────────────────────────────────

export interface SlotInterval {
  startTime: Date;
  endTime: Date;
}

export interface GenerateRangeResult {
  totalCreated: number;
  totalSkipped: number;
  createdSlots: SlotInterval[];
  skippedSlots: SlotInterval[];
}

// ── Funções exportadas ────────────────────────────────────────

/**
 * buildDaySlots(date)
 *
 * Recebe um Date UTC (meia-noite do dia) e retorna um array com
 * todos os SlotInterval válidos para aquele dia, já com startTime
 * e endTime calculados em UTC.
 *
 * Não toca o banco — só monta os objetos.
 */
export function buildDaySlots(date: Date): SlotInterval[] {
  const weekend = isWeekend(date);

  const startTimes = weekend
    ? [...WEEKDAY_START_TIMES, ...WEEKEND_EXTRA_TIMES]
    : WEEKDAY_START_TIMES;

  return startTimes.map((hhmm) => {
    const startTime = applyTimeUTC(date, hhmm);
    const endTime = addMinutes(startTime, SLOT_DURATION_MINUTES);
    return { startTime, endTime };
  });
}

/**
 * generateSlotsForDate(date, createdById)
 *
 * Gera e persiste no banco todos os slots de um único dia.
 * Evita duplicados verificando @@unique [startTime, endTime].
 *
 * @param date        - Date UTC (meia-noite do dia desejado)
 * @param createdById - ID do usuário admin que está gerando
 * @returns objeto com slots criados e slots ignorados (duplicados)
 */
export async function generateSlotsForDate(
  date: Date,
  createdById: string,
): Promise<{ created: SlotInterval[]; skipped: SlotInterval[] }> {
  const intervals = buildDaySlots(date);

  const created: SlotInterval[] = [];
  const skipped: SlotInterval[] = [];

  for (const interval of intervals) {
    // Verifica duplicata pela constraint única do schema
    const existing = await prisma.slot.findUnique({
      where: {
        startTime_endTime: {
          startTime: interval.startTime,
          endTime: interval.endTime,
        },
      },
      select: { id: true },
    });

    if (existing) {
      skipped.push(interval);
      continue;
    }

    await prisma.slot.create({
      data: {
        startTime: interval.startTime,
        endTime: interval.endTime,
        maxCapacity: DEFAULT_MAX_CAPACITY,
        active: true,
        blockedForSchool: false,
        createdById,
      },
    });

    created.push(interval);
  }

  return { created, skipped };
}

/**
 * generateSlotsRange(startDate, endDate, createdById)
 *
 * Percorre todas as datas entre startDate e endDate (inclusive)
 * e chama generateSlotsForDate para cada uma.
 *
 * @param startDate   - string "YYYY-MM-DD"
 * @param endDate     - string "YYYY-MM-DD"
 * @param createdById - ID do usuário admin que está gerando
 * @returns resumo total de slots criados e ignorados
 */
export async function generateSlotsRange(
  startDate: string,
  endDate: string,
  createdById: string,
): Promise<GenerateRangeResult> {
  const start = parseDateUTC(startDate);
  const end = parseDateUTC(endDate);

  if (start > end) {
    throw new Error('startDate deve ser anterior ou igual a endDate.');
  }

  const result: GenerateRangeResult = {
    totalCreated: 0,
    totalSkipped: 0,
    createdSlots: [],
    skippedSlots: [],
  };

  // Percorre dia a dia de start até end (inclusive)
  const current = new Date(start);
  while (current <= end) {
    const { created, skipped } = await generateSlotsForDate(
      new Date(current),
      createdById,
    );

    result.totalCreated += created.length;
    result.totalSkipped += skipped.length;
    result.createdSlots.push(...created);
    result.skippedSlots.push(...skipped);

    // Avança um dia em UTC
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}