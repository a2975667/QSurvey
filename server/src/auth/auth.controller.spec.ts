import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;
  let configService: ConfigService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            googleLogin: jest.fn().mockReturnValue({
              status: 200,
              access_token: 'test-token',
            }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://example.com'),
          },
        },
      ],
    }).compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
    configService = moduleRef.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('googleAuthRedirect', () => {
    it('should redirect to configured FRONTEND_URL', () => {
      const mockReq = { user: { _id: 'test-id' } };
      const mockRes = {
        redirect: jest.fn(),
      };
      
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      authController.googleAuthRedirect(mockReq, mockRes);

      expect(authService.googleLogin).toHaveBeenCalledWith(mockReq);
      expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://example.com/login-success?token=test-token',
      );
    });

    it('should use localhost url when configured', () => {
      const mockReq = { user: { _id: 'test-id' } };
      const mockRes = {
        redirect: jest.fn(),
      };
      
      jest.spyOn(configService, 'get').mockReturnValue('http://localhost:4200');
      
      authController.googleAuthRedirect(mockReq, mockRes);

      expect(authService.googleLogin).toHaveBeenCalledWith(mockReq);
      expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(mockRes.redirect).toHaveBeenCalledWith(
        'http://localhost:4200/login-success?token=test-token',
      );
    });
  });
});
