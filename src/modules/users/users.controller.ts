import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
} from './users.schemas';

// ── ADMIN: Listar usuários ───────────────────────────────────

export async function listUsers(req: Request, res: Response) {
  const query = listUsersSchema.safeParse(req.query);

  if (!query.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: query.error.flatten().fieldErrors,
      },
    });
  }

  const { role, active, page, pageSize } = query.data;

  const where = {
    ...(role && { role }),
    ...(active !== undefined && { active }),
  };

  const skip = (page - 1) * pageSize;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return res.status(200).json({
    data: users,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

// ── ADMIN: Criar usuário operador ────────────────────────────

export async function createUser(req: Request, res: Response) {
  const body = createUserSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: body.error.flatten().fieldErrors,
      },
    });
  }

  const { name, email, password, role } = body.data;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res.status(409).json({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Já existe um usuário com esse e-mail.',
      },
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return res.status(201).json({ data: user });
}

// ── ADMIN: Atualizar usuário ─────────────────────────────────

export async function updateUser(req: Request, res: Response) {
  const userId = req.params['userId'] as string;

  const body = updateUserSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: body.error.flatten().fieldErrors,
      },
    });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Usuário não encontrado.' },
    });
  }

  const updateData: Record<string, unknown> = {};

  if (body.data.name) updateData.name = body.data.name;
  if (body.data.active !== undefined) updateData.active = body.data.active;
  if (body.data.role) updateData.role = body.data.role;

  if (body.data.password) {
    updateData.passwordHash = await bcrypt.hash(body.data.password, 12);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      updatedAt: true,
    },
  });

  return res.status(200).json({ data: updated });
}
