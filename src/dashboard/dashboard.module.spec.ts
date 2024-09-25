import { Test, TestingModule } from '@nestjs/testing';
import { DashboardModule } from './dashboard.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

/**
 * Sample of Integration Test for module Dashboard
 */
describe('DashboardModule', () => {
  let dashboardService: DashboardService;
  let dashboardController: DashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [DashboardModule],
    }).compile();

    dashboardService = module.get<DashboardService>(DashboardService);
    dashboardController = module.get<DashboardController>(DashboardController);
  });

  it('should have the DashboardService defined', () => {
    expect(dashboardService).toBeDefined();
  });

  it('should have the DashboardController defined', () => {
    expect(dashboardController).toBeDefined();
  });
});
