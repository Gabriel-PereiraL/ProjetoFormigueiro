import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth';
import { listUsers, createUser, updateUser } from './users.controller';

export const adminUsersRoutes = Router();

adminUsersRoutes.use(authenticate, authorize('ADMIN'));

// GET  /v1/admin/users
adminUsersRoutes.get('/', listUsers);

// POST /v1/admin/users
adminUsersRoutes.post('/', createUser);

// PATCH /v1/admin/users/:userId
adminUsersRoutes.patch('/:userId', updateUser);
