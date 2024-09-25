import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('DashboardController', () => {
  let controller: DashboardController;
  let mockRes: Partial<Response>;

  const mockDashboardService = {
    streamDashboardData: jest.fn(),
  };

  beforeEach(async () => {
    // Create a mock response object
    mockRes = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      status: jest.fn().mockReturnThis(), // Allow status to be chainable
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  it('should stream dashboard data successfully', async () => {
    // Mock the service to resolve (not reject)
    mockDashboardService.streamDashboardData.mockResolvedValueOnce(undefined);

    // Call the controller method
    await controller.getDashboardData(mockRes as Response);

    // Expect the service to have been called
    expect(mockDashboardService.streamDashboardData).toHaveBeenCalledWith(
      mockRes,
    );
  });

  it('should handle HttpException thrown by the service', async () => {
    const error = new HttpException('Service Error', HttpStatus.BAD_GATEWAY);
    mockDashboardService.streamDashboardData.mockRejectedValueOnce(error);

    // Expect the controller to throw the error correctly
    await expect(
      controller.getDashboardData(mockRes as Response),
    ).rejects.toThrow(HttpException);

    expect(mockDashboardService.streamDashboardData).toHaveBeenCalledWith(
      mockRes,
    );
  });

  it('should handle unexpected errors', async () => {
    mockDashboardService.streamDashboardData.mockRejectedValueOnce(
      new Error('Unexpected Error'),
    );

    await expect(
      controller.getDashboardData(mockRes as Response),
    ).rejects.toThrowError(
      new HttpException(
        'Internal Server Error while streaming dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );

    expect(mockDashboardService.streamDashboardData).toHaveBeenCalledWith(
      mockRes,
    );
  });
});
