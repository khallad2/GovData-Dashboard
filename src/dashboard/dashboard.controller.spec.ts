import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('DashboardController', () => {
  let controller: DashboardController;

  const mockDashboardService = {
    getDashboardData: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('should return dashboard data successfully', async () => {
    const mockData = [{ name: 'Ministry A', count: 10 }];
    mockDashboardService.getDashboardData.mockResolvedValue(mockData);

    const result = await controller.getDashboardData();
    expect(result).toEqual({ success: true, data: mockData });
    expect(mockDashboardService.getDashboardData).toHaveBeenCalledTimes(1);
  });

  it('should return no dashboard data available if empty', async () => {
    mockDashboardService.getDashboardData.mockResolvedValue([]);

    const result = await controller.getDashboardData();
    expect(result).toEqual({ message: 'No dashboard data available' });
  });

  it('should handle HttpException thrown by service', async () => {
    const error = new HttpException('Service Error', HttpStatus.BAD_GATEWAY);
    mockDashboardService.getDashboardData.mockRejectedValueOnce(error);

    await expect(controller.getDashboardData()).rejects.toThrow(HttpException);
  });

  it('should handle unexpected errors', async () => {
    mockDashboardService.getDashboardData.mockRejectedValueOnce(
      new Error('Unexpected Error'),
    );

    await expect(controller.getDashboardData()).rejects.toThrowError(
      new HttpException(
        'Internal Server Error while fetching dashboard data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      ),
    );
  });
});
