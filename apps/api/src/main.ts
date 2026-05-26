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

export async function bootstrap(): Promise<express.Express> {
  if (cachedApp) return cachedApp;

  const server = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    { rawBody: true },
  );
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  server.set('trust proxy', 1);
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Phyat API')
    .setDescription('URL shortening API for Phyat')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
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

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Phyat API')
      .setDescription('URL shortening API for Phyat')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`API Documentation: http://localhost:${port}/api/docs`);
  })();
}
