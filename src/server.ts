import 'dotenv/config';

import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/database';

console.log(env);

async function start() {
  try {
    await prisma.$connect();

    console.log('✅ Database connected');

    app.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT}`);
    });

  } catch (error) {
    console.error('❌ Database connection failed');
    console.error(error);
  }
}

start();