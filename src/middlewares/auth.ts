import { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';

import { env } from '../config/env';

// Extende Request do Express
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;

        role: 'ADMIN' | 'OPERATOR';
      };
    }
  }
}

// Middleware de autenticação
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token não fornecido.',
      },
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;

      role: 'ADMIN' | 'OPERATOR';
    };

    req.user = {
      id: payload.sub,

      role: payload.role,
    };

    next();
  } catch {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token inválido ou expirado.',
      },
    });
  }
}

// Middleware de autorização
export function authorize(...roles: Array<'ADMIN' | 'OPERATOR'>) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Acesso negado.',
        },
      });
    }

    next();
  };
}