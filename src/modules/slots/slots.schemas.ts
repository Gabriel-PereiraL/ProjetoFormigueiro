import { z } from 'zod';

// ── Criar slot com horário real ────────────────────────────
// startTime e endTime são ISO 8601 (ex: "2026-05-20T09:30:00.000Z")
export const createSlotSchema = z
  .object({
    startTime: z
      .string()
      .min(1, 'startTime é obrigatório')
      .refine((v) => !isNaN(Date.parse(v)), {
        message: 'startTime deve ser uma data/hora ISO 8601 válida',
      }),

    endTime: z
      .string()
      .min(1, 'endTime é obrigatório')
      .refine((v) => !isNaN(Date.parse(v)), {
        message: 'endTime deve ser uma data/hora ISO 8601 válida',
      }),

    maxCapacity: z.number().int().min(1).max(500).default(20),

    blockedForSchool: z.boolean().default(false),
  })
  .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
    message: 'startTime deve ser anterior ao endTime',
    path: ['startTime'],
  });

// ── Atualizar slot ─────────────────────────────────────────
export const updateSlotSchema = z.object({
  maxCapacity: z.number().int().min(1).max(500).optional(),

  blockedForSchool: z.boolean().optional(),

  active: z.boolean().optional(),
});

// ── Bloquear slot ──────────────────────────────────────────
export const blockSlotSchema = z.object({
  blockedForSchool: z.boolean(),
});

// ── Listar slots (filtragem por data + paginação) ──────────
// date = "YYYY-MM-DD" — filtra todos os slots que iniciam naquele dia
export const listSlotsSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido. Use YYYY-MM-DD')
    .optional(),

  blockedForSchool: z.coerce.boolean().optional(),

  active: z.coerce.boolean().optional(),

  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
