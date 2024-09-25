import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DashboardService } from '../src/dashboard/dashboard.service';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let dashboardService: DashboardService;

  const mockDashboardResponse = {
    success: true,
    data: [
      { name: 'Ministry A', count: 100 },
      { name: 'Ministry B', count: 200 },
    ],
  };

  const mockDashboardData = [
    { name: 'Ministry A', count: 100 },
    { name: 'Ministry B', count: 200 },
  ];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    dashboardService = moduleFixture.get<DashboardService>(DashboardService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(HttpStatus.OK)
      .expect('Hello World!');
  });

  describe('/api/dashboard (GET)', () => {
    it('should return dashboard data successfully', () => {
      jest
        .spyOn(dashboardService, 'getDashboardData')
        .mockResolvedValueOnce(mockDashboardData);

      return request(app.getHttpServer())
        .get('/dashboard')
        .expect(HttpStatus.OK)
        .expect(mockDashboardResponse);
    });

    it('should return a 500 error if dashboard service fails', () => {
      jest
        .spyOn(dashboardService, 'getDashboardData')
        .mockRejectedValueOnce(new Error('Internal Server Error'));

      return request(app.getHttpServer())
        .get('/dashboard')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect({
          statusCode: 500,
          message: 'Internal Server Error while fetching dashboard data',
        });
    });

    it('should return empty array if no data is available', () => {
      jest
        .spyOn(dashboardService, 'getDashboardData')
        .mockResolvedValueOnce([]);

      return request(app.getHttpServer())
        .get('/dashboard')
        .expect(HttpStatus.OK)
        .expect({ message: 'No dashboard data available' });
    });
  });
});
