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
            get: jest.fn().mockImplementation((key) => {
              switch (key) {
                case 'REDIRECT_URL':
                  return 'http://example.com/callback';
                case 'mode':
                  return 'backend';
                default:
                  return null;
              }
            }),
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
    it('should redirect to configured URL in backend mode', () => {
      const mockReq = { user: { _id: 'test-id' } };
      const mockRes = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      };
      
      jest.spyOn(console, 'log').mockImplementation(() => {});
      
      authController.googleAuthRedirect(mockReq, mockRes);
      
      expect(authService.googleLogin).toHaveBeenCalledWith(mockReq);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'login_payload',
        JSON.stringify({
          status: 200,
          access_token: 'test-token',
        }),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith('http://example.com/callback');
    });

    it('should redirect to localhost in non-backend mode', () => {
      const mockReq = { user: { _id: 'test-id' } };
      const mockRes = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      };
      
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        switch (key) {
          case 'REDIRECT_URL':
            return 'http://example.com/callback';
          case 'mode':
            return 'development';
          default:
            return null;
        }
      });
      
      authController.googleAuthRedirect(mockReq, mockRes);
      
      expect(authService.googleLogin).toHaveBeenCalledWith(mockReq);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'login_payload',
        JSON.stringify({
          status: 200,
          access_token: 'test-token',
        }),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith('http://localhost:4200/login-sucess');
    });
  });
});
