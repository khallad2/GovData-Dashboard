import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Response } from 'express';

@Controller('/api/dashboard')
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard
   * Streams the aggregated dashboard data from the DashboardService.
   * Applies proper error handling and logging for better observability.
   * @param res - Express Response object used for streaming.
   * @returns void (response is streamed directly via Express).
   */
  @Get()
  async getDashboardData(@Res() res: Response): Promise<void> {
    this.logger.log('Fetching and streaming dashboard data');

    try {
      // Call the streaming method and pass the response object
      await this.dashboardService.streamDashboardData(res);

      // Since the data is streamed, no need to return anything from the controller
    } catch (error) {
      this.logger.error(
        `Error streaming dashboard data: ${error.message}`,
        error.stack,
      );

      // Handle service errors and send appropriate HTTP response
      if (error instanceof HttpException) {
        throw error; // Re-throw any known HttpException
      } else {
        // For unexpected errors, return an Internal Server Error
        throw new HttpException(
          'Internal Server Error while streaming dashboard data',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
