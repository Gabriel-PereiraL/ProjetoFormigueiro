import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import {
  listPublicSlots,
  listOperatorSlots,
  createSlot,
  updateSlot,
  blockSlot,
  deactivateSlot,
} from './slots.controller';

// ── PÚBLICAS ─────────────────────────────────────────────────
// GET /v1/public/slots?date=YYYY-MM-DD

export const publicSlotsRoutes = Router();

publicSlotsRoutes.get('/', listPublicSlots);

// ── OPERATOR (auth: ADMIN | OPERATOR) ────────────────────────
// GET /v1/operator/slots

export const operatorSlotsRoutes = Router();

operatorSlotsRoutes.use(authenticate, authorize('ADMIN', 'OPERATOR'));

operatorSlotsRoutes.get('/', listOperatorSlots);

// ── ADMIN (auth: ADMIN) ───────────────────────────────────────
// POST   /v1/admin/slots
// PATCH  /v1/admin/slots/:slotId
// PATCH  /v1/admin/slots/:slotId/block
// DELETE /v1/admin/slots/:slotId  (soft delete)

export const adminSlotsRoutes = Router();

adminSlotsRoutes.use(authenticate, authorize('ADMIN'));

adminSlotsRoutes.post('/', createSlot);

adminSlotsRoutes.patch('/:slotId', updateSlot);

adminSlotsRoutes.patch('/:slotId/block', blockSlot);

adminSlotsRoutes.delete('/:slotId', deactivateSlot);
