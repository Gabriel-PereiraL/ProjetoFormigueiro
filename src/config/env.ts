import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),

  JWT_REFRESH_SECRET: z.string().min(32),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');

  console.error(parsed.error.flatten().fieldErrors);

  process.exit(1);
}

export const env = parsed.data;