import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation for request payloads
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip out properties that aren't in the DTO
      forbidNonWhitelisted: true, // Throw an error if there are unexpected properties
      transform: true, // Automatically transform payloads to match DTO classes
    }),
  );

  // Global route prefix (e.g., /api/your-route)
  app.setGlobalPrefix('api');

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
