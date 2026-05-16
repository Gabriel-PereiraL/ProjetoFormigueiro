import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),

  email: z.string().email(),

  password: z.string().min(8).max(100),

  role: z.enum(['ADMIN', 'OPERATOR']).default('OPERATOR'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),

  password: z.string().min(8).max(100).optional(),

  role: z.enum(['ADMIN', 'OPERATOR']).optional(),

  active: z.boolean().optional(),
});

export const listUsersSchema = z.object({
  role: z.enum(['ADMIN', 'OPERATOR']).optional(),

  active: z.coerce.boolean().optional(),

  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
