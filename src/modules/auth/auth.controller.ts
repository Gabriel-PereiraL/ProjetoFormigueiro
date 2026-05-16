import { Request, Response } from 'express';

import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';

import { prisma } from '../../config/database';

import { env } from '../../config/env';

import {
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './auth.schemas';

// Em produção: Redis
const validRefreshTokens = new Set<string>();

function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign(
    {
      sub: userId,

      role,
    },

    env.JWT_SECRET,

    {
      expiresIn: '15m',
    }
  );

  const refreshToken = jwt.sign(
    {
      sub: userId,

      role,
    },

    env.JWT_REFRESH_SECRET,

    {
      expiresIn: '7d',
    }
  );

  return {
    accessToken,

    refreshToken,
  };
}

// LOGIN
export async function login(req: Request, res: Response) {
  const body = loginSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
      },
    });
  }

  const { email, password } = body.data;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  const INVALID_MESSAGE = 'Email ou senha inválidos.';

  if (!user || !user.active) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: INVALID_MESSAGE,
      },
    });
  }

  const passwordMatch = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatch) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: INVALID_MESSAGE,
      },
    });
  }

  const { accessToken, refreshToken } = generateTokens(
    user.id,
    user.role
  );

  validRefreshTokens.add(refreshToken);

  return res.status(200).json({
    data: {
      accessToken,

      refreshToken,

      expiresIn: 900,

      user: {
        id: user.id,

        name: user.name,

        role: user.role,
      },
    },
  });
}

// REFRESH
export async function refresh(req: Request, res: Response) {
  const body = refreshSchema.safeParse(req.body);

  if (!body.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Refresh token obrigatório.',
      },
    });
  }

  const { refreshToken } = body.data;

  if (!validRefreshTokens.has(refreshToken)) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Refresh token inválido.',
      },
    });
  }

  try {
    const payload = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET
    ) as {
      sub: string;

      role: string;
    };

    validRefreshTokens.delete(refreshToken);

    const tokens = generateTokens(
      payload.sub,
      payload.role
    );

    validRefreshTokens.add(tokens.refreshToken);

    return res.status(200).json({
      data: {
        accessToken: tokens.accessToken,

        refreshToken: tokens.refreshToken,

        expiresIn: 900,
      },
    });
  } catch {
    validRefreshTokens.delete(refreshToken);

    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Refresh token expirado.',
      },
    });
  }
}

// LOGOUT
export async function logout(req: Request, res: Response) {
  const body = logoutSchema.safeParse(req.body);

  if (body.success) {
    validRefreshTokens.delete(body.data.refreshToken);
  }

  return res.status(204).send();
}