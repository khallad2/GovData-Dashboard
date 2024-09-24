import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import * as querystring from 'querystring';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DashboardService {
  private readonly govDataApiUrl: string;
  private readonly departmentsJsonUrl: string;

  constructor(private configService: ConfigService) {
    // Load URLs from environment variables
    this.govDataApiUrl = this.configService.get<string>('GOVDATA_API_URL');
    this.departmentsJsonUrl = this.configService.get<string>(
      'DEPARTMENTS_JSON_URL',
    );
  }

  // Fetch departments.json from the GitHub URL
  async fetchDepartmentsData(): Promise<any> {
    try {
      const response = await axios.get(this.departmentsJsonUrl, {
        timeout: 1000,
      }); // Set time out to 10 seconds to make sure data is loaded
      return response.data.departments;
    } catch (error) {
      console.error('Error fetching departments.json:', error.message);
      throw new HttpException(
        'Failed to load departments.json',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Fetch datasets for a specific ministry from the GovData API
  async fetchMinistryDatasetCount(ministryName: string): Promise<number> {
    try {
      // URL encode the ministry name
      const query = querystring.stringify({ q: ministryName });
      const response = await axios.get(`${this.govDataApiUrl}?${query}`);
      return response.data.result.count || 0;
    } catch (error) {
      console.error(`Error fetching data for ${ministryName}:`, error.message);
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
