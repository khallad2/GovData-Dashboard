import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard
   * Fetches and returns the aggregated dashboard data from the DashboardService.
   * Applies proper error handling and logging for better observability.
   * @returns Aggregated dashboard data or an error response.
   */
  @Get()
  async getDashboardData(): Promise<any> {
    this.logger.log('Fetching dashboard data');

    try {
      // Fetch data from the service
      const data = await this.dashboardService.getDashboardData();

      // Check if data is available and return it, otherwise return 204 No Content
      if (!data || data.length === 0) {
        this.logger.warn('No dashboard data found');
        return { message: 'No dashboard data available' }; // 204 or a custom message
      }

      this.logger.log('Successfully fetched dashboard data');
      return { success: true, data }; // Ensure a consistent response structure
    } catch (error) {
      this.logger.error(
        `Error fetching dashboard data: ${error.message}`,
        error.stack,
      );

      // Handling service errors and sending appropriate HTTP response
      if (error instanceof HttpException) {
        throw error; // Re-throw any known HttpException
      } else {
        // For unexpected errors, return an Internal Server Error
        throw new HttpException(
          'Internal Server Error while fetching dashboard data',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
