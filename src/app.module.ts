import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi'; // Import Joi for environment validation
import { AppController } from './app.controller';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // ConfigModule setup with validation
    ConfigModule.forRoot({
      isGlobal: true, // Makes the configuration globally available
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`, // Load .env based on NODE_ENV
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        GOVDATA_API_URL: Joi.string().uri().required(), // Ensure the URL is provided and is valid
        DEPARTMENTS_JSON_URL: Joi.string().uri().required(), // Ensure the URL is provided and is valid
        PORT: Joi.number().default(3000), // Optional: define the PORT with a default value
      }),
    }),
    DashboardModule, // Your feature module
  ],
  controllers: [AppController],
})
export class AppModule {}
