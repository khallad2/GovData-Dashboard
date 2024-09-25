import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

describe('AppModule', () => {
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  it('should load environment variables', () => {
    expect(configService.get('GOVDATA_API_URL')).toBeDefined();
    expect(configService.get('DEPARTMENTS_JSON_URL')).toBeDefined();
  });

  it('should validate NODE_ENV', () => {
    const nodeEnv = configService.get<string>('NODE_ENV');
    expect(['development', 'production', 'test']).toContain(nodeEnv);
  });
});
