import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import * as querystring from 'querystring';
import { ConfigService } from '@nestjs/config';
import { GovDataResult } from './interfaces/result.interface';
import { Department } from './interfaces/department.interface';

@Injectable()
export class DashboardService {
  private readonly govDataApiUrl: string;
  private readonly departmentsJsonUrl: string;
  private readonly logger = new Logger(DashboardService.name);

  constructor(private configService: ConfigService) {
    this.govDataApiUrl = this.configService.get<string>('GOVDATA_API_URL');
    this.departmentsJsonUrl = this.configService.get<string>(
      'DEPARTMENTS_JSON_URL',
    );

    axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        this.logger.error(`Request failed: ${error.message}`);
        return Promise.reject(error);
      },
    );
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number,
    delay: number,
    isRetryable: (error: any) => boolean,
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      if (retries === 0 || !isRetryable(error)) {
        this.logger.error(
          `Max retries reached or non-retryable error occurred: ${error.message}`,
        );
        throw new HttpException(
          'Failed to fetch external data after retries',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      this.logger.warn(`Retrying request. Attempts left: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryRequest(requestFn, retries - 1, delay * 2, isRetryable);
    }
  }

  async fetchDepartmentsData(): Promise<Department[]> {
    this.logger.log(
      `Fetching departments data from ${this.departmentsJsonUrl}`,
    );
    try {
      const response = await this.retryRequest(
        () => axios.get<{ departments: Department[] }>(this.departmentsJsonUrl),
        this.configService.get<number>('REQUEST_RETRY') || 3,
        this.configService.get<number>('REQUEST_TIMEOUT') || 1000,
        (error) =>
          error.isAxiosError &&
          (!error.response || error.response.status >= 500), // Retry only on network errors
      );
      return response.data.departments;
    } catch (error) {
      this.logger.error(
        `Error fetching departments.json: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to load departments.json',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fetchMinistryDatasetCount(ministryName: string): Promise<number> {
    // Input validation (basic validation, can be improved)
    if (!ministryName || typeof ministryName !== 'string') {
      this.logger.warn(`Invalid ministry name: ${ministryName}`);
      return 0;
    }

    try {
      const query = querystring.stringify({ q: ministryName });
      this.logger.log(`Fetching dataset count for ministry: ${ministryName}`);
      const response = await this.retryRequest(
        () => axios.get<GovDataResult>(`${this.govDataApiUrl}?${query}`),
        this.configService.get<number>('REQUEST_RETRY') || 3, // Retry 3 times for ministry dataset fetching
        this.configService.get<number>('REQUEST_TIMEOUT') || 10000,
        (error) =>
          error.isAxiosError &&
          (!error.response || error.response.status >= 500), // Retry only on network issues
      );
      return response.data.result.count || 0;
    } catch (error) {
      this.logger.error(
        `Error fetching data for ${ministryName}: ${error.message}`,
      );
      return 0;
    }
  }

  // Process the CKAN API data and aggregate it by ministries and their subordinates
  async getDashboardData(): Promise<any> {
    // Fetch the departments from GitHub
    const departments = await this.fetchDepartmentsData();

    // Prepare an array for ministry dataset counts
    const ministryData: Array<{ name: string; count: number }> = [];

    // Load the ministry names and subordinates from the departments.json
    for (const department of departments) {
      const ministryName = department.name;

      // Fetch the dataset count for the ministry
      let datasetCount = await this.fetchMinistryDatasetCount(ministryName);

      // Add subordinates if available
      if (department.subordinates) {
        for (const subordinate of department.subordinates) {
          const subordinateName = subordinate.name;
          datasetCount += await this.fetchMinistryDatasetCount(subordinateName);
        }
      }

      // Push the ministry and its dataset count as an object
      ministryData.push({ name: ministryName, count: datasetCount });
    }

    // Sort the array by dataset count in descending order
    return ministryData.sort((a, b) => b.count - a.count);
  }
}
