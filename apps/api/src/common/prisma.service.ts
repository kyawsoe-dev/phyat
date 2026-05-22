import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';

const certPath = '/tmp/aiven-ca.pem';

// Write TLS certificate from env var to temp file (PostgreSQL requires a file path, not inline string)
if (process.env.DB_CA_CERT) {
  mkdirSync('/tmp', { recursive: true });
  writeFileSync(certPath, process.env.DB_CA_CERT, 'utf8');
}

const logLevels = process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ log: logLevels as never });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
