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

## Project Overview

GovData Dashboard is an API that fetches and aggregates datasets from various governmental ministries. 
It interacts with external APIs and processes large amounts of data while providing robust error handling 
and retry logic to ensure reliability.

---

## Features

- **Data Aggregation**: Gathers and aggregates datasets from multiple ministries.
- **Retry Mechanism**: Handles network issues with retry logic to increase reliability.
- **Caching**: Caches results to avoid redundant API calls.
- **Logging**: Logging for more detailed insights and clean production logs.
- **ValidationPipe**: For automatically validating incoming requests.
  **Graceful Shutdown**: Handles application termination gracefully to prevent data corruption.
- **Configuration Validation**: Uses Joi to ensure required environment variables are set.
- **API Prefixing and Global Validation**: Supports global API prefixes and request validation using NestJS validation pipes.
- **e2e,Unit and integration Testing with coverage 95%**: Includes unit tests for services, controllers, and critical paths, e2e tests.

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
git clone https://github.com/your-username/govdata-dashboard.git
cd govdata-dashboard
```
### Install dependencies:

```bash
npm install
# or
yarn install
```

### Configuration
- The project uses environment variables for configuration. Copy the .env.example to .env and fill out the required values.
```bash
cp .env.example .env
```


## Required Environment Variables
- **GOVDATA_API_URL**: The base URL for the external GovData API.
- **DEPARTMENTS_JSON_URL**: URL of the departments JSON file.

### Example `.env` file:
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

### Running with Docker

If you prefer Docker, you can use the following commands to build and run the project:

```bash
docker build -t govdata-dashboard .
docker run -p 3000:3000 govdata-dashboard
```

The application will be running on `http://localhost:3000`.

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
- handle large datasets efficiently
- implement rate-limiting (throttling)for requests: which would further protect against potential DoS attacks, 
    especially if this service were exposed to the public.
- Caching can be made more sophisticated with a TTL (Time To Live) to avoid stale data for ministries that might update frequently.
- In the retry logic, increasing the delay exponentially on each retry could make the system more resilient to network outages, but there is a risk of delaying too much.
