import { Test, TestingModule } from '@nestjs/testing';
import { ProtectedSurveysController } from './protected-surveys.controller';

describe('ProtectedSurveysController', () => {
  let controller: ProtectedSurveysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProtectedSurveysController],
    }).compile();

    controller = module.get<ProtectedSurveysController>(
      ProtectedSurveysController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
