
# GovData Dashboard API

A NestJS-powered API that provides dashboard data by aggregating datasets from multiple ministries. This project is structured to ensure performance, security, and scalability. It uses Axios for HTTP requests, and Joi and ConfigService for environment configuration validation.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Getting Started](#getting-started)
4. [Configuration](#configuration)
5. [Running the Project](#running-the-project)
6. [Testing](#testing)
7. [API Documentation](#api-documentation)

---

# Project Overview

GovData Dashboard is an API that fetches and aggregates datasets from various governmental ministries.
It interacts with external APIs and processes large amounts of data while providing robust error handling
and retry logic to ensure reliability.

## API Request Approach for Fetching Ministries Data

### Initially

I aimed to send a single request to fetch data for multiple ministries and their subordinates by sending multiple query parameters in the request URL.
For example, we attempted the following API call with two ministries: `https://demo.ckan.org/api/3/action/package_search?q=Bundesamt%20f%C3%BCr%20Justiz&q=Deutsches%20Patent-%20und%20Markenamt`
However, this approach consistently returned 0 results.
After some investigation, we found that CKAN’s `package_search` API does not support searching with multiple `q` parameters for different entities in a single request.
It treats the multiple `q` parameters as a combined search query, resulting in no relevant data being returned.

#### Current Approach

Due to the limitations of batching ministry names in a single API request, we switched to an approach where each ministry and its subordinates are fetched separately in individual requests.
This ensures we retrieve accurate data for each entity, as seen in the
following example: `https://demo.ckan.org/api/3/action/package_search?q=Bundesamt%20f%C3%BCr%20Justiz`
In this way, we make individual requests for each ministry and its subordinates, processing the data separately to ensure that the correct results are returned for each entity.
While this approach requires multiple requests, it provides the most accurate and reliable data retrieval from the CKAN API.

The method `streamDashboardData` in `DashboardService` streams ministry and subordinate dataset counts as they are processed:
1. The service fetches the data in chunks from external APIs.
2. It progressively writes JSON objects to the response stream using the Node.js `Response` object from Express.
3. Each ministry's data is flushed to the client as soon as it is processed, ensuring the data is streamed in real time.
4. The entire process is non-blocking, ensuring efficient resource usage and fast delivery of data.

---

## Features
- **Data Streaming**: Data streaming helps to:
  - **Reduce Latency**: Clients start receiving data as soon as the first portion is available, improving response times for large datasets.
  - **Optimize Memory Usage**: Instead of loading the entire dataset into memory, the service processes and streams chunks of data progressively, reducing memory consumption.
  - **Enhance User Experience**: Especially with large datasets, the client can begin processing the data (e.g., displaying results) while more data is still being fetched, improving the overall user experience.
- **Data Aggregation**: Gathers and aggregates datasets from multiple ministries and their subordinated agencies.
- **Retry Mechanism**: Handles network issues with retry logic to increase reliability.
- **Caching**: Caches results to avoid redundant API calls.
- **Logging**: Logging for more detailed insights and clean production logs.
- **ValidationPipe**: For automatically validating incoming requests.
  **Graceful Shutdown**: Handles application termination gracefully to prevent data corruption.
- **Configuration Validation**: Uses Joi to ensure required environment variables are set.
- **API Prefixing and Global Validation**: Supports global API prefixes and request validation using NestJS validation pipes.
- **e2e,Unit and integration Testing with coverage 95%**: Includes unit tests for services, controllers, and critical paths, e2e tests.

---

## Ministries Dashboard UI

A simple user interface has been created to display the results from the `/api/dashboard` API. This UI fetches the list of ministries and their respective dataset counts, and presents them in a clean, responsive format. The ministry with the highest count is highlighted in **green**, and the one with the lowest count is highlighted in **red**. A loader is displayed while the data is being fetched.

### How it works:
- The UI is built with plain HTML and JavaScript.
- Upon loading, the page sends a request to the `/api/dashboard` endpoint.
- The response is displayed as cards, each showing a ministry name and its dataset count.

You can view the dashboard by visiting the following URL in your browser:

[http://localhost:3000/](http://localhost:3000/)

---

## Getting Started

Follow these instructions to get the project up and running.

### Prerequisites

You’ll need the following installed on your machine:

- **Node.js** (v14 or later)
- **npm** or **yarn**
- **Docker** (Optional), for running services like databases or third-party APIs)

### Clone the repository:

```bash
git clone https://github.com/khallad2/GovData-Dashboard.git
cd govdata-dashboard
```
### Install dependencies:

```bash
npm install
# or
yarn install
```

### Configuration
- The project uses environment variables for configuration. I have provided .env.development with the required values.
`.env.example.development`


## Required Environment Variables
- **GOVDATA_API_URL**: The base URL for the external GovData API.
- **DEPARTMENTS_JSON_URL**: URL of the departments JSON file.

### Example `.env.development, .env.production, .env.test` file:
```bash
GOVDATA_API_URL=https://api.govdata.example
DEPARTMENTS_JSON_URL=https://github.example/departments.json
```

---

## Running the Project

### Development Mode

To start the project in development mode, run the following command:

```bash
npm run start:dev
# or
yarn start:dev
```

### Production Mode

To start the project in production mode:

```bash
npm run build
npm run start:prod
# or
yarn build
yarn start:prod
```

---

## Testing

The project includes a test suite that covers both unit tests and integration tests.

### Running Unit Tests

```bash
npm run test
# or
yarn test
```

### Running Test Coverage

To get detailed test coverage, run:

```bash
npm run test:cov
# or
yarn test:cov
```

This will provide a detailed report of how much of the codebase is covered by tests.

### run e2e test
```bash
npm run test:e2e
#or
yarn test:e2e
```

---

## API Documentation

### Endpoints

- **GET /dashboard**: Fetches aggregated dataset counts for ministries and their subordinates.

### Response Example:
```json
[
  {
    "name": "Ministry A",
    "count": 100
  },
  {
    "name": "Ministry B",
    "count": 200
  }
]
```

### Error Responses:
- **400 Bad Request**: Invalid request format or parameters.
- **500 Internal Server Error**: An error occurred during data processing or API fetching.


### If I have more time:
- Enhance streamDashboardData function to improve readability, maintainability, performance.
- Implement rate-limiting (throttling) for requests: which would further protect against potential DoS attacks,
  especially if this service were exposed to the public.
- Caching can be made more sophisticated with a TTL (Time To Live) to avoid stale data for ministries that might update frequently.
- Investigate: In the retry logic, increasing the delay exponentially on each retry could make the system more resilient to network outages, but there is a risk of delaying too much.
