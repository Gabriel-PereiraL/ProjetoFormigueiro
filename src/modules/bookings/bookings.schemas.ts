import { z } from 'zod';

export const createBookingSchema = z.object({
  slotId: z.string().uuid(),

  visitorName: z.string().min(2).max(100),

  visitorEmail: z.string().email(),

  visitorPhone: z.string().min(8).max(20),

  visitorCount: z.number().int().min(1),

  notes: z.string().max(500).optional(),
});

export const cancelPublicSchema = z.object({
  visitorEmail: z.string().email(),
});

export const listBookingsSchema = z.object({
  slotId: z.string().uuid().optional(),

  // ✅ CANCELED — nunca CANCELLED
  status: z.enum(['CONFIRMED', 'CANCELED']).optional(),

  visitorEmail: z.string().optional(),

  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
