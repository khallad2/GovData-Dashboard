import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DashboardService } from '../src/dashboard/dashboard.service';
import { Response } from 'express';

describe('DashboardController (e2e)', () => {
  let app: INestApplication;
  let dashboardService: DashboardService;

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

  describe('/dashboard (GET)', () => {
    it('should stream dashboard data successfully', async () => {
      jest
        .spyOn(dashboardService, 'streamDashboardData')
        .mockImplementationOnce(async (res: Response) => {
          // Simulating how streamDashboardData behaves when streaming data
          res.setHeader('Content-Type', 'application/json');
          res.write('[');
          res.write(JSON.stringify(mockDashboardData[0]));
          res.write(',');
          res.write(JSON.stringify(mockDashboardData[1]));
          res.write(']');
          res.end();
        });

      return request(app.getHttpServer())
        .get('/dashboard')
        .expect(HttpStatus.OK)
        .expect('Content-Type', /json/)
        .expect((res) => {
          expect(res.text).toEqual(JSON.stringify(mockDashboardData));
        });
    });

    it('should return a 500 error if dashboard service fails during streaming', async () => {
      jest
        .spyOn(dashboardService, 'streamDashboardData')
        .mockImplementationOnce(async (res: Response) => {
          throw new Error(`Internal Server Error: ${res}`);
        });

      return request(app.getHttpServer())
        .get('/dashboard')
        .expect(HttpStatus.INTERNAL_SERVER_ERROR)
        .expect({
          statusCode: 500,
          message: 'Internal Server Error while streaming dashboard data',
        });
    });

    it('should return an empty array if no data is available', async () => {
      jest
        .spyOn(dashboardService, 'streamDashboardData')
        .mockImplementationOnce(async (res: Response) => {
          res.setHeader('Content-Type', 'application/json');
          res.write('[]');
          res.end();
        });

      return request(app.getHttpServer())
        .get('/dashboard')
        .expect(HttpStatus.OK)
        .expect('Content-Type', /json/)
        .expect([]);
    });
  });
});
