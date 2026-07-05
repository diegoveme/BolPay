import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('nodeEnv') === 'production';

  // All routes are served under /api (matches VITE_API_URL on the web client).
  app.setGlobalPrefix('api');

  // Baseline security headers. Referrer is suppressed so tokenized links in
  // URLs are never leaked to third-party origins.
  app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));

  // Strip unknown properties and coerce DTO types globally.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Only the configured web origins may call the API from a browser.
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  app.enableCors({ origin: corsOrigins, credentials: false });
  app.enableShutdownHooks();

  // API docs are exposed only outside production.
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('BolPay API')
      .setDescription(
        'Freelance contracts, milestone escrow (Trustless Work on Stellar) and on-chain payroll in USDC.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, () =>
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);

  if (!isProduction) {
    console.log(
      `BolPay API listening on http://localhost:${port}/api (docs: /api/docs)`,
    );
  }
}

void bootstrap();
