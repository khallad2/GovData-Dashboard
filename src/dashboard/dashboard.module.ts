import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule if using ConfigService
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [ConfigModule], // Ensure that ConfigService is available for the DashboardService
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
