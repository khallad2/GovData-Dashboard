import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { HttpException } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestHeaders } from 'axios';
import { Department } from './interfaces/department.interface';
import { GovDataResult } from './interfaces/result.interface';
import { Response } from 'express'; // Import the Response object from 'express'

jest.mock('axios');

describe('DashboardService', () => {
  let service: DashboardService;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'DEPARTMENTS_JSON_URL':
          return 'http://github.example/departments.json';
        case 'GOVDATA_API_URL':
          return 'https://www.govdata.de/ckan/api/3/action/package_search';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    // Create a mocked axios instance
    mockAxiosInstance = {
      get: jest.fn(), // Mock the `get` method of axiosInstance
    } as unknown as jest.Mocked<AxiosInstance>;

    // Mock `axios.create` to return the mocked axios instance
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks after each test
  });

  describe('fetchDepartmentsData', () => {
    it('should fetch departments data successfully', async () => {
      const departments: Department[] = [{ name: 'Ministry A' }];

      const axiosResponse: AxiosResponse = {
        data: { departments },
        status: 200,
        statusText: 'OK',
        headers: {}, // Include the required 'headers' property
        config: { headers: {} as AxiosRequestHeaders }, // Include 'config' object with 'headers'
      };

      // Mock axiosInstance.get to resolve successfully
      mockAxiosInstance.get.mockResolvedValueOnce(axiosResponse);

      const result = await service.fetchDepartmentsData();
      expect(result).toEqual(departments);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'http://github.example/departments.json',
      );
    });

    it('should throw an HttpException when axios throws an AxiosError', async () => {
      // Mock axiosInstance.get to reject with an AxiosError
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: 'Server Error',
        },
      };
      mockAxiosInstance.get.mockRejectedValueOnce(axiosError);
      await expect(service.fetchDepartmentsData()).rejects.toThrow(
        HttpException,
      );
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });

    it('should throw an HttpException when an unexpected error occurs', async () => {
      // Mock axiosInstance.get to throw a generic error
      const error = new Error('Unexpected Error');
      mockAxiosInstance.get.mockRejectedValueOnce(error);
      await expect(service.fetchDepartmentsData()).rejects.toThrow(
        HttpException,
      );
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });
  });

  describe('fetchMinistryDatasetCount', () => {
    const govDataResult: GovDataResult = {
      help: 'string',
      success: true,
      result: { count: 10 },
    };

    const axiosResponse: AxiosResponse = {
      data: govDataResult,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: { headers: {} as AxiosRequestHeaders }, // Include 'config' object with 'headers'
    };

    it('should fetch dataset count for a ministry and cache the result', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce(axiosResponse);

      const result = await service.fetchMinistryDatasetCount('Ministry A');
      expect(result).toEqual(10);
      expect(service['ministryCache'].get('Ministry A')).toEqual(10);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'https://www.govdata.de/ckan/api/3/action/package_search?q=Ministry%20A',
      );
    });

    it('should return cached value if available when fetching ministries', async () => {
      service['ministryCache'].set('Ministry A', 5);
      const result = await service.fetchMinistryDatasetCount('Ministry A');
      expect(result).toEqual(5);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should return 0 if ministryName is invalid', async () => {
      const result = await service.fetchMinistryDatasetCount('');
      expect(result).toEqual(0);
      expect(mockAxiosInstance.get).not.toHaveBeenCalled();
    });

    it('should retry on network-related errors', async () => {
      const govDataResult: GovDataResult = {
        help: 'string',
        success: false,
        result: { count: 20 },
      };

      const axiosResponse: AxiosResponse = {
        data: govDataResult,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as AxiosRequestHeaders }, // Include 'config' object with 'headers'
      };

      mockAxiosInstance.get
        .mockRejectedValueOnce({ isAxiosError: true, response: null })
        .mockResolvedValueOnce(axiosResponse);

      const result = await service.fetchMinistryDatasetCount('Ministry A');
      expect(result).toEqual(expect.any(Number));
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should return 0 if the request fails after retries', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network Error'));

      const result = await service.fetchMinistryDatasetCount('Ministry A');
      expect(result).toEqual(0);
      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });
  });

  describe('streamDashboardData', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
      // Mock the Response object
      mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        flushHeaders: jest.fn(),
        status: jest.fn().mockReturnThis(), // Allow chainable status setting
        send: jest.fn(),
      };
    });

    it('should stream dashboard data successfully', async () => {
      const departments: Department[] = [
        { name: 'Ministry A', subordinates: [{ name: 'Subordinate A1' }] },
      ];

      // Mocking the data fetching methods
      jest
        .spyOn(service, 'fetchDepartmentsData')
        .mockResolvedValueOnce(departments);
      jest
        .spyOn(service, 'fetchMinistryDatasetCount')
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      await service.streamDashboardData(mockRes as Response);

      // Verify the response behavior
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json',
      );
      expect(mockRes.write).toHaveBeenCalledWith('[');
      expect(mockRes.write).toHaveBeenCalledWith(
        '{"name":"Ministry A","count":15}',
      );
      expect(mockRes.write).toHaveBeenCalledWith(']');
      expect(mockRes.end).toHaveBeenCalled();
      expect(mockRes.flushHeaders).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during data streaming', async () => {
      const error = new Error('Test Error');
      jest.spyOn(service, 'fetchDepartmentsData').mockRejectedValueOnce(error);

      await service.streamDashboardData(mockRes as Response);

      // Check that the error is handled correctly
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Error while streaming data');
    });

    it('should handle empty departments and return an empty array', async () => {
      jest.spyOn(service, 'fetchDepartmentsData').mockResolvedValueOnce([]);

      await service.streamDashboardData(mockRes as Response);

      expect(mockRes.write).toHaveBeenCalledWith('[');
      expect(mockRes.write).toHaveBeenCalledWith(']');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });

  describe('handleHttpError', () => {
    it('should throw HttpException for 4xx errors', () => {
      const axiosError: AxiosError = {
        response: { status: 400, data: 'Bad Request' },
      } as AxiosError;

      expect(() =>
        service['handleHttpError'](axiosError, 'Test Context'),
      ).toThrow(HttpException);
    });

    it('should throw HttpException for 5xx errors', () => {
      const axiosError: AxiosError = {
        response: { status: 500, data: 'Server Error' },
      } as AxiosError;

      expect(() =>
        service['handleHttpError'](axiosError, 'Test Context'),
      ).toThrow(HttpException);
    });

    it('should throw HttpException when no response is received', () => {
      const axiosError: AxiosError = {
        request: {},
      } as AxiosError;

      expect(() =>
        service['handleHttpError'](axiosError, 'Test Context'),
      ).toThrow(HttpException);
    });

    it('should throw HttpException for unexpected errors', () => {
      const axiosError: AxiosError = {
        message: 'Unexpected Error',
      } as AxiosError;

      expect(() =>
        service['handleHttpError'](axiosError, 'Test Context'),
      ).toThrow(HttpException);
    });
  });

  describe('streamDashboardData additional edge cases', () => {
    let mockRes: Partial<Response>;

    beforeEach(() => {
      mockRes = {
        setHeader: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
        flushHeaders: jest.fn(),
        status: jest.fn().mockReturnThis(), // Allow chainable status setting
        send: jest.fn(),
      };
    });

    it('should stream empty data if no departments are returned', async () => {
      jest.spyOn(service, 'fetchDepartmentsData').mockResolvedValueOnce([]);

      await service.streamDashboardData(mockRes as Response);

      // Check if response sends empty array
      expect(mockRes.write).toHaveBeenCalledWith('[');
      expect(mockRes.write).toHaveBeenCalledWith(']');
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should handle large datasets without crashing', async () => {
      const largeDepartments: Department[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          name: `Ministry ${i}`,
          subordinates: [],
        }),
      );

      jest
        .spyOn(service, 'fetchDepartmentsData')
        .mockResolvedValueOnce(largeDepartments);
      jest.spyOn(service, 'fetchMinistryDatasetCount').mockResolvedValue(100);

      await service.streamDashboardData(mockRes as Response);

      // Verify that the stream processed the large dataset
      expect(mockRes.write).toHaveBeenCalledWith('[');
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('Ministry 999'),
      );
      expect(mockRes.write).toHaveBeenCalledWith(']');
      expect(mockRes.end).toHaveBeenCalled();
    });
  });
});
