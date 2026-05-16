import express from 'express';

import { publicRateLimiter } from './middlewares/rateLimiter';

// Auth
import { authRoutes } from './modules/auth/auth.routes';

// Slots
import {
  publicSlotsRoutes,
  operatorSlotsRoutes,
  adminSlotsRoutes,
} from './modules/slots/slots.routes';

// Bookings
import {
  publicBookingsRoutes,
  operatorBookingsRoutes,
} from './modules/bookings/bookings.routes';

// Users
import { adminUsersRoutes } from './modules/users/users.routes';

export const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  return res.status(200).json({
    status: 'ok',
  });
});

// Auth
app.use('/v1/auth', authRoutes);

// Públicas
app.use(
  '/v1/public/slots',
  publicRateLimiter,
  publicSlotsRoutes
);

app.use(
  '/v1/public/bookings',
  publicRateLimiter,
  publicBookingsRoutes
);

// Operator
app.use('/v1/operator/slots', operatorSlotsRoutes);

app.use('/v1/operator/bookings', operatorBookingsRoutes);

// Admin
app.use('/v1/admin/slots', adminSlotsRoutes);

app.use('/v1/admin/users', adminUsersRoutes);

// 404
app.use((_req, res) => {
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Rota não encontrada.',
    },
  });
});