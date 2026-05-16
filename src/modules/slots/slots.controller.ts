import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import {
  createSlotSchema,
  updateSlotSchema,
  blockSlotSchema,
  listSlotsSchema,
} from './slots.schemas';
import { validateSlotStartTime } from '../../shared/utils/slotValidations';

// ── Helpers ─────────────────────────────────────────────────

function paginate(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

function metaResponse(page: number, pageSize: number, total: number) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ── PUBLIC: Listar slots disponíveis por data ────────────────

export async function listPublicSlots(req: Request, res: Response) {
  const query = listSlotsSchema.safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: query.error.flatten().fieldErrors,
      },
    });
  }

  const { date, page, pageSize } = query.data;

  const dateFilter = date
    ? {
        startTime: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
      }
    : {};

  const where = {
    active: true,
    ...dateFilter,
  };

  const [slots, total] = await Promise.all([
    prisma.slot.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: {
              where: { status: 'CONFIRMED' },
            },
          },
        },
      },
      orderBy: { startTime: 'asc' },
      ...paginate(page, pageSize),
    }),
    prisma.slot.count({ where }),
  ]);

  const enriched = slots.map((slot) => ({
    ...slot,
    confirmedBookings: slot._count.bookings,
    available: slot.maxCapacity - slot._count.bookings,
  }));

  return res.status(200).json({
    data: enriched,
    meta: metaResponse(page, pageSize, total),
  });
}

// ── OPERATOR: Listar slots (inclui inativos) ─────────────────

export async function listOperatorSlots(req: Request, res: Response) {
  const query = listSlotsSchema.safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: query.error.flatten().fieldErrors,
      },
    });
  }

  const { date, blockedForSchool, active, page, pageSize } = query.data;

  const dateFilter = date
    ? {
        startTime: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        },
      }
    : {};

  const where = {
    ...dateFilter,
    ...(blockedForSchool !== undefined && { blockedForSchool }),
    ...(active !== undefined && { active }),
  };

  const [slots, total] = await Promise.all([
    prisma.slot.findMany({
      where,
      include: {
        _count: {
          select: {
            bookings: {
              where: { status: 'CONFIRMED' },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { startTime: 'asc' },
      ...paginate(page, pageSize),
    }),
    prisma.slot.count({ where }),
  ]);

  const enriched = slots.map((slot) => ({
    ...slot,
    confirmedBookings: slot._count.bookings,
    available: slot.maxCapacity - slot._count.bookings,
  }));

  return res.status(200).json({
    data: enriched,
    meta: metaResponse(page, pageSize, total),
  });
}

// ── ADMIN: Criar slot com horário real ───────────────────────

export async function createSlot(req: Request, res: Response) {
  const body = createSlotSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: body.error.flatten().fieldErrors,
      },
    });
  }

  const { startTime, endTime, maxCapacity, blockedForSchool } = body.data;

  const start = new Date(startTime);
  const end = new Date(endTime);

  // ── REGRAS DE NEGÓCIO: validar startTime ─────────────────
  const validation = validateSlotStartTime(start);
  if (!validation.valid) {
    return res.status(422).json({
      error: {
        code: validation.code,
        message: validation.message,
      },
    });
  }

  // Verificar duplicação exata (mesmo startTime + endTime)
  const duplicate = await prisma.slot.findUnique({
    where: {
      startTime_endTime: {
        startTime: start,
        endTime: end,
      },
    },
  });

  if (duplicate) {
    return res.status(409).json({
      error: {
        code: 'SLOT_DUPLICATE',
        message: `Já existe um slot com o mesmo horário: ${startTime} → ${endTime}`,
      },
    });
  }

  // Verificar overlap
  const overlapping = await prisma.slot.findFirst({
    where: {
      active: true,
      AND: [
        { startTime: { lt: end } },
        { endTime: { gt: start } },
      ],
    },
  });

  if (overlapping) {
    return res.status(409).json({
      error: {
        code: 'SLOT_OVERLAP',
        message: `O slot conflita com um horário existente: ${overlapping.startTime.toISOString()} → ${overlapping.endTime.toISOString()}`,
      },
    });
  }

  const slot = await prisma.slot.create({
    data: {
      startTime: start,
      endTime: end,
      maxCapacity,
      blockedForSchool,
      createdById: req.user!.id,
    },
  });

  return res.status(201).json({ data: slot });
}

// ── ADMIN: Atualizar slot ────────────────────────────────────

export async function updateSlot(req: Request, res: Response) {
  const slotId = req.params['slotId'] as string;

  const body = updateSlotSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: body.error.flatten().fieldErrors,
      },
    });
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Slot não encontrado.' },
    });
  }

  const updated = await prisma.slot.update({
    where: { id: slotId },
    data: body.data,
  });

  return res.status(200).json({ data: updated });
}

// ── ADMIN: Bloquear / desbloquear slot para escolas ──────────

export async function blockSlot(req: Request, res: Response) {
  const slotId = req.params['slotId'] as string;

  const body = blockSlotSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: body.error.flatten().fieldErrors,
      },
    });
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Slot não encontrado.' },
    });
  }

  const updated = await prisma.slot.update({
    where: { id: slotId },
    data: { blockedForSchool: body.data.blockedForSchool },
  });

  return res.status(200).json({ data: updated });
}

// ── ADMIN: Desativar slot (soft delete) ──────────────────────

export async function deactivateSlot(req: Request, res: Response) {
  const slotId = req.params['slotId'] as string;

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Slot não encontrado.' },
    });
  }

  const updated = await prisma.slot.update({
    where: { id: slotId },
    data: { active: false },
  });

  return res.status(200).json({ data: updated });
}
