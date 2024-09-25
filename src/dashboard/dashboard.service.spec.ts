import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { HttpException } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestHeaders } from 'axios';
import { Department } from './interfaces/department.interface';
import { GovDataResult } from './interfaces/result.interface';

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

  describe('getDashboardData', () => {
    it('should aggregate dataset counts for ministries and subordinates', async () => {
      const departments: Department[] = [
        { name: 'Ministry A', subordinates: [{ name: 'Subordinate A1' }] },
      ];

      const axiosResponse: AxiosResponse = {
        data: { departments },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as AxiosRequestHeaders },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(axiosResponse);
      jest
        .spyOn(service, 'fetchMinistryDatasetCount')
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5);

      const result = await service.getDashboardData();
      expect(result).toEqual([{ name: 'Ministry A', count: 15 }]);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(service.fetchMinistryDatasetCount).toHaveBeenCalledTimes(2);
    });

    it('should handle errors for subordinates and continue processing', async () => {
      const departments: Department[] = [
        { name: 'Ministry A', subordinates: [{ name: 'Subordinate A1' }] },
      ];

      const axiosResponse: AxiosResponse = {
        data: { departments },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as AxiosRequestHeaders },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(axiosResponse);
      jest
        .spyOn(service, 'fetchMinistryDatasetCount')
        .mockResolvedValueOnce(10)
        .mockRejectedValueOnce(new Error('Subordinate Error'));

      const result = await service.getDashboardData();
      expect(result).toEqual([{ name: 'Ministry A', count: 10 }]);
      expect(service.fetchMinistryDatasetCount).toHaveBeenCalledTimes(2);
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
});
