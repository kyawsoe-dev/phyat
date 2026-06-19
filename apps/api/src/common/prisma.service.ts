import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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

  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Database connection failed', error instanceof Error ? error.stack : undefined);
    }
  }

  async onModuleDestroy() {
  }
}
