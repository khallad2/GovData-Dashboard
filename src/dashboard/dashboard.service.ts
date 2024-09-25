import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express'; // Import the Response object from 'express'
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
  private ministryCache = new Map<string, number>(); // Caches dataset counts to reduce duplicate API calls
  private readonly axiosInstance = axios.create({
    timeout: 10000, // Global timeout for Axios requests to avoid hanging requests
  });

  /**
   * Constructor to initialize URLs and config settings
   * @param configService - Injected ConfigService to access application settings.
   */
  constructor(private configService: ConfigService) {
    this.govDataApiUrl = this.configService.get<string>('GOVDATA_API_URL'); // Fetching the govData API URL from environment
    this.departmentsJsonUrl = this.configService.get<string>(
      'DEPARTMENTS_JSON_URL', // Fetching the departments JSON URL from environment
    );
  }

  /**
   * Retries a request function multiple times with exponential backoff in case of errors.
   * @param requestFn - The function making the request (e.g., axios call).
   * @param retries - Number of retries to attempt before giving up.
   * @param delay - Initial delay between retries.
   * @param isRetryable - Function to determine if an error is retryable.
   * @returns The result of the request, or throws an error after retries.
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number,
    delay: number,
    isRetryable: (error: any) => boolean, // Function that checks if the error can be retried (e.g., network error)
  ): Promise<T> {
    try {
      return await requestFn(); // Attempting to execute the request function
    } catch (error) {
      if (retries === 0 || !isRetryable(error)) {
        // If no retries are left or error isn't retryable, throw error
        this.logger.error(
          `Max retries reached or non-retryable error occurred: ${error.message}`,
        );
        throw new HttpException(
          'Failed to fetch external data after retries',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      this.logger.warn(`Retrying request. Attempts left: ${retries}`);
      await new Promise(
        (resolve) => setTimeout(resolve, delay + Math.random() * 1000), // Adding a random delay to avoid retry synchronization
      );
      // Recursive call with an exponentially increased delay
      return this.retryRequest(requestFn, retries - 1, delay * 2, isRetryable);
    }
  }

  /**
   * Fetches department data from the given departments JSON URL.
   * @returns A promise that resolves to an array of Department objects.
   * @throws HttpException when the data cannot be fetched.
   */
  async fetchDepartmentsData(): Promise<Department[]> {
    this.logger.log(
      `Fetching departments data from ${this.departmentsJsonUrl}`, // Log the action of fetching department data
    );
    try {
      const response = await this.axiosInstance.get<{
        departments: Department[];
      }>(this.departmentsJsonUrl); // Fetch departments JSON data using axios
      return response.data.departments; // Return only the departments data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleHttpError(error, 'Error fetching departments.json'); // Call error handler if it's an AxiosError
      }
      this.logger.error(
        `Unexpected error fetching departments.json: ${error.message}`, // Log unexpected error
        error.stack,
      );
      throw new HttpException(
        'Failed to load departments.json',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Fetches the dataset count for a given ministry from the govData API.
   * Caches the results to avoid redundant requests.
   * @param ministryName - The name of the ministry for which to fetch dataset count.
   * @returns A promise that resolves to the dataset count (number).
   */
  async fetchMinistryDatasetCount(ministryName: string): Promise<number> {
    // Validate ministry name (accepts any non-empty string)
    if (!ministryName || typeof ministryName !== 'string') {
      this.logger.warn(`Invalid ministry name provided: ${ministryName}`);
      return 0;
    }

    // Check if the result is already cached
    if (this.ministryCache.has(ministryName)) {
      return this.ministryCache.get(ministryName); // Return cached value if available
    }

    try {
      const query = querystring.stringify({ q: ministryName }); // Encode the ministry name into a query string
      this.logger.log(`Fetching dataset count for ministry: ${ministryName}`);

      const response = await this.retryRequest(
        () =>
          this.axiosInstance.get<GovDataResult>(
            `${this.govDataApiUrl}?${query}`, // Make the API request with the query string for the ministry
          ),
        3, // Retry up to 3 times
        1000, // Initial delay of 1 second between retries
        (error) => error.isAxiosError && !error.response, // Retry only on network-related issues, not 4xx/5xx errors
      );

      const datasetCount = response.data.result.count || 0; // Extract dataset count or default to 0 if not found

      // Cache the result for future requests
      this.ministryCache.set(ministryName, datasetCount);
      return datasetCount; // Return the dataset count for the ministry
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.handleHttpError(error, `Error fetching data for ${ministryName}`); // Handle Axios-specific error
      }
      return 0; // Return 0 if there was an error
    }
  }

  /**
   * Handles and logs HTTP errors from axios requests.
   * Differentiates between client-side (4xx) and server-side (5xx) errors.
   * @param error - The AxiosError object from the failed request.
   * @param context - The context or message to be logged with the error.
   * @throws HttpException with appropriate status code and message.
   */
  private handleHttpError(error: AxiosError, context: string): void {
    if (error.response) {
      // If the error has a response, extract its status and data
      const statusCode = error.response.status;
      const responseData = error.response.data;
      if (statusCode >= 400 && statusCode < 500) {
        // Handle client-side errors (4xx)
        this.logger.warn(
          `${context}: Client-side error (status: ${statusCode}): ${responseData}`,
        );
        throw new HttpException(
          `Client error while processing request: ${responseData}`,
          HttpStatus.BAD_REQUEST,
        );
      } else if (statusCode >= 500) {
        // Handle server-side errors (5xx)
        this.logger.error(
          `${context}: Server-side error (status: ${statusCode}): ${responseData}`,
        );
        throw new HttpException(
          'External service failed, please try again later.',
          HttpStatus.BAD_GATEWAY,
        );
      }
    } else if (error.request) {
      // No response received from the server
      this.logger.error(`${context}: No response received from server.`);
      throw new HttpException(
        'No response from the external service, please try again later.',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    } else {
      // Unknown/unexpected error occurred
      this.logger.error(
        `${context}: Unexpected error occurred: ${error.message}`,
      );
      throw new HttpException(
        'An unexpected error occurred, please try again later.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Stream ministry and subordinate dataset counts as they are processed.
   * @param res - The Express response object used for streaming.
   * @throws HttpException if any issues occur during data fetching.
   */
  async streamDashboardData(res: Response): Promise<any> {
    try {
      // Fetch the list of departments from the external source
      const departments = await this.fetchDepartmentsData();

      // Initialize an empty array to store ministry data (name and dataset count)
      const ministryData: Array<{ name: string; count: number }> = [];

      // Iterate over each department to fetch the ministry data
      for (const department of departments) {
        const ministryName = department.name; // Extract the ministry name from the department
        let datasetCount =
          (await this.fetchMinistryDatasetCount(ministryName)) ?? 0; // Fetch dataset count for the ministry and fallback to 0 if undefined

        // If the ministry has subordinates, fetch their dataset counts
        if (department.subordinates) {
          // Fetch dataset counts for all subordinates in parallel
          const subordinateCounts = await Promise.all(
            department.subordinates.map(async (subordinate) => {
              try {
                // Fetch dataset count for each subordinate
                return await this.fetchMinistryDatasetCount(subordinate.name);
              } catch (error) {
                // Log an error if there's an issue fetching subordinate data
                this.logger.error(
                  `Failed to fetch data for subordinate ${subordinate.name}: ${error.message}`,
                );
                return 0; // Return 0 for the subordinate if an error occurs
              }
            }),
          );
          // Add the subordinate dataset counts to the ministry's dataset count
          datasetCount += subordinateCounts.reduce(
            (acc, count) => acc + count,
            0, // Start with 0 and accumulate counts
          );
        }

        // Push the ministry name and its dataset count into the ministryData array
        ministryData.push({ name: ministryName, count: datasetCount });
      }

      // Sort the ministry data in descending order by dataset count
      ministryData.sort((a, b) => b.count - a.count);

      // Set the response header to indicate that the content is JSON
      res.setHeader('Content-Type', 'application/json');
      res.write('['); // Start the JSON array in the response

      let first = true; // A flag to track if it's the first ministry being written
      for (const ministry of ministryData) {
        if (!first) {
          res.write(','); // Add a comma between ministries, except before the first one
        }
        first = false; // Mark that the first ministry has been written

        // Write the ministry data as a JSON object into the response stream
        res.write(JSON.stringify(ministry));

        // Flush headers to ensure the data is sent progressively (non-blocking)
        res.flushHeaders();
      }

      res.write(']'); // End the JSON array in the response
      res.end(); // Close the connection after sending the entire response
    } catch (error) {
      // Log any error that occurs during the data streaming process
      this.logger.error(`Error while streaming data: ${error.message}`);
      // Respond with a 500 status code and an error message in case of failure
      res.status(500).send('Error while streaming data');
    }
  }
}
