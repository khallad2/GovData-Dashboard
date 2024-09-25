import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { Response } from 'express'; // Import Express' Response type
import { join } from 'path';

describe('AppController', () => {
  let appController: AppController;
  let mockRes: Partial<Response>;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);

    // Mock the Express Response object
    mockRes = {
      sendFile: jest.fn(), // Mock the sendFile method
    };
  });

  describe('root', () => {
    it('should serve the index.html file', () => {
      // Call the getHello method with the mocked response
      appController.getHello(mockRes as Response);

      // Expect sendFile to have been called with the correct path
      expect(mockRes.sendFile).toHaveBeenCalledWith(
        join(__dirname, '..', 'public', 'index.html'),
      );
    });
  });
});
