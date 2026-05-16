import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import {
  createBookingSchema,
  cancelPublicSchema,
  listBookingsSchema,
} from './bookings.schemas';
import { validateSlotStartTime } from '../../shared/utils/slotValidations';

// ── Helpers de paginação ────────────────────────────────────

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

// ── PUBLIC: Criar agendamento ───────────────────────────────

export async function createBooking(req: Request, res: Response) {
  const body = createBookingSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: body.error.flatten().fieldErrors,
      },
    });
  }

  const {
    slotId,
    visitorName,
    visitorEmail,
    visitorPhone,
    visitorCount,
    notes,
  } = body.data;

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
  });

  if (!slot) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Slot não encontrado.',
      },
    });
  }

  if (!slot.active) {
    return res.status(400).json({
      error: { code: 'SLOT_INACTIVE' },
    });
  }

  if (slot.blockedForSchool) {
    return res.status(400).json({
      error: { code: 'SLOT_BLOCKED' },
    });
  }

  // ── REGRAS DE NEGÓCIO: validar horário do slot ───────────
  // O visitante não pode reservar um slot em horário inválido ou expirado.
  // Valida: whitelist de horários, almoço, expiração, período manhã/tarde.
  const validation = validateSlotStartTime(slot.startTime);
  if (!validation.valid) {
    return res.status(422).json({
      error: {
        code: validation.code,
        message: validation.message,
      },
    });
  }

  const aggregate = await prisma.booking.aggregate({
    where: {
      slotId,
      status: 'CONFIRMED',
    },
    _sum: { visitorCount: true },
  });

  const occupied = aggregate._sum.visitorCount ?? 0;
  const available = slot.maxCapacity - occupied;

  if (visitorCount > available) {
    return res.status(400).json({
      error: {
        code: 'SLOT_FULL',
        available,
      },
    });
  }

  const booking = await prisma.booking.create({
    data: {
      slotId,
      visitorName,
      visitorEmail,
      visitorPhone,
      visitorCount,
      notes,
      bookingCode: randomUUID().slice(0, 8).toUpperCase(),
    },
  });

  return res.status(201).json({ data: booking });
}

// ── PUBLIC: Cancelar agendamento (visitante) ────────────────

export async function cancelPublicBooking(req: Request, res: Response) {
  const id = req.params['id'] as string;

  const body = cancelPublicSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR' },
    });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
  });

  if (!booking) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND' },
    });
  }

  if (
    booking.visitorEmail.toLowerCase() !==
    body.data.visitorEmail.toLowerCase()
  ) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN' },
    });
  }

  if (booking.status === 'CANCELED') {
    return res.status(400).json({
      error: { code: 'BOOKING_ALREADY_CANCELED' },
    });
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  });

  return res.status(200).json({ data: updated });
}

// ── OPERATOR: Listar agendamentos ───────────────────────────

export async function listBookings(req: Request, res: Response) {
  const query = listBookingsSchema.safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR' },
    });
  }

  const { slotId, status, visitorEmail, page, pageSize } = query.data;

  const where = {
    ...(slotId && { slotId }),
    ...(status && { status }),
    ...(visitorEmail && {
      visitorEmail: {
        contains: visitorEmail,
        mode: 'insensitive' as const,
      },
    }),
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: { slot: true },
      orderBy: { createdAt: 'desc' },
      ...paginate(page, pageSize),
    }),
    prisma.booking.count({ where }),
  ]);

  return res.status(200).json({
    data: bookings,
    meta: metaResponse(page, pageSize, total),
  });
}

// ── OPERATOR: Cancelar agendamento (operador) ───────────────

export async function cancelOperatorBooking(req: Request, res: Response) {
  const bookingId = req.params['bookingId'] as string;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND' },
    });
  }

  if (booking.status === 'CANCELED') {
    return res.status(400).json({
      error: { code: 'BOOKING_ALREADY_CANCELED' },
    });
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
      canceledById: req.user!.id,
    },
  });

  return res.status(200).json({ data: updated });
}
