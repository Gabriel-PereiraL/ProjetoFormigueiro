import rateLimit from 'express-rate-limit';

// Usado apenas nas rotas públicas
export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto

  max: 60,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Muitas requisições. Tente novamente em 1 minuto.',
    },
  },
});