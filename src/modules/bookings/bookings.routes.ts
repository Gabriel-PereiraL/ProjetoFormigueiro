import { Router } from 'express';

import {
  authenticate,
  authorize,
} from '../../middlewares/auth';

import {
  createBooking,
  cancelPublicBooking,
  listBookings,
  cancelOperatorBooking,
} from './bookings.controller';

// PUBLIC
export const publicBookingsRoutes =
  Router();

publicBookingsRoutes.post(
  '/',
  createBooking
);

publicBookingsRoutes.patch(
  '/:id/cancel',
  cancelPublicBooking
);

// OPERATOR
export const operatorBookingsRoutes =
  Router();

operatorBookingsRoutes.use(
  authenticate,
  authorize('ADMIN', 'OPERATOR')
);

operatorBookingsRoutes.get(
  '/',
  listBookings
);

operatorBookingsRoutes.patch(
  '/:bookingId/cancel',
  cancelOperatorBooking
);