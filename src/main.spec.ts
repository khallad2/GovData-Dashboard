import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

// Mock the external libraries
jest.mock('@nestjs/core', () => ({
  NestFactory: {
    create: jest.fn(),
  },
}));

// Test Suite
describe('Main Bootstrap', () => {
  let app: {
    use: jest.Mock;
    useGlobalPipes: jest.Mock;
    listen: jest.Mock;
    enableCors: jest.Mock;
    enableShutdownHooks: jest.Mock;
  };

  beforeEach(async () => {
    // Mock the Nest application instance
    app = {
      use: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValueOnce(true),
      enableCors: jest.fn(),
      enableShutdownHooks: jest.fn(),
    };

    // Mock NestFactory.create to return the mocked app instance
    (NestFactory.create as jest.Mock).mockResolvedValue(app);

    // Import the bootstrap function
    const { bootstrap } = await import('./main');
    await bootstrap();
  });

  it('should create the app and call listen', async () => {
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
    expect(app.listen).toHaveBeenCalledWith(3000);
  });

  it('should enable CORS', () => {
    expect(app.enableCors).toHaveBeenCalled();
  });

  it('should set the global validation pipe', () => {
    expect(app.useGlobalPipes).toHaveBeenCalledWith(expect.any(ValidationPipe));
  });

  it('should enable shutdown hooks', () => {
    expect(app.enableShutdownHooks).toHaveBeenCalled();
  });
});
