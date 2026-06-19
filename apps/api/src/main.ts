import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SecurityMiddleware } from './common/security.middleware';
import { RateLimitMiddleware } from './common/rate-limit.middleware';
import { GlobalExceptionFilter } from './common/exception.filter';
import * as express from 'express';

let cachedApp: express.Express;

function healthCheckHandler(req: any, res: any) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

export async function bootstrap(): Promise<express.Express> {
  if (cachedApp) return cachedApp;

  const server = express();
  server.set('trust proxy', 1);
  server.get('/', healthCheckHandler);

  try {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
      { rawBody: true },
    );
    const config = app.get(ConfigService);
    const logger = new Logger('Bootstrap');

    app.enableCors({
      origin: config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000',
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.use(SecurityMiddleware);
    app.use(RateLimitMiddleware);

    if (process.env.NODE_ENV !== 'production') {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Phyat API')
        .setDescription('URL shortening API for Phyat')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('api/docs', app, document);
    }

    await app.init();
  } catch (error) {
    console.error('NestJS init failed, running in degraded mode:', error);
  }

  cachedApp = server;
  return server;
}

export default async (req: any, res: any) => {
  const app = await bootstrap();
  app(req, res);
};

if (require.main === module) {
  (async () => {
    const app = await NestFactory.create(AppModule, { rawBody: true });
    const config = app.get(ConfigService);
    const port = config.get<number>('PORT') ?? 4000;
    const logger = new Logger('Bootstrap');

    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.enableCors({
      origin: config.get<string>('WEB_ORIGIN') ?? 'http://localhost:3000',
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.use(SecurityMiddleware);
    app.use(RateLimitMiddleware);

    if (process.env.NODE_ENV !== 'production') {
      const swaggerConfig = new DocumentBuilder()
        .setTitle('Phyat API')
        .setDescription('URL shortening API for Phyat')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
      const document = SwaggerModule.createDocument(app, swaggerConfig);
      SwaggerModule.setup('api/docs', app, document);
    }

    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`API Documentation: http://localhost:${port}/api/docs`);
  })();
}
