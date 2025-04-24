import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
            sign: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key, defaultValue) => {
              if (key === 'JWT_REFRESH_THRESHOLD') return defaultValue;
              return null;
            }),
          },
        },
      ],
    }).compile();

    // Mock Logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException if no user is provided', () => {
      const context = createMock<ExecutionContext>();
      
      expect(() => guard.handleRequest(null, null, null, context)).toThrow(
        UnauthorizedException,
      );
    });

    it('should throw the original error if an error is provided', () => {
      const context = createMock<ExecutionContext>();
      const error = new Error('Test error');
      
      expect(() => guard.handleRequest(error, null, null, context)).toThrow(
        'Test error',
      );
    });

    it('should return the user if a user is provided', () => {
      const mockUser = { userId: '123', username: 'test@example.com', roles: ['Designer'] };
      const mockRequest: any = {
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const mockResponse = {
        setHeader: jest.fn(),
      };
      
      const context = createMock<ExecutionContext>({
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      });
      
      // Mock jwt.decode to return null (no token refresh needed)
      jest.spyOn(jwtService, 'decode').mockReturnValueOnce(null);
      
      const result = guard.handleRequest(null, mockUser, null, context);
      
      expect(result).toEqual(mockUser);
      expect(mockRequest.user).toEqual(mockUser);
    });
  });

  describe('checkAndRefreshToken', () => {
    it('should not issue a new token if authorization header is missing', () => {
      const mockRequest = { headers: {} };
      const mockResponse = { setHeader: jest.fn() };
      
      // Use reflection to access private method
      const checkAndRefreshToken = (guard as any).checkAndRefreshToken.bind(guard);
      checkAndRefreshToken(mockRequest, mockResponse);
      
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(jwtService.decode).not.toHaveBeenCalled();
    });

    it('should not issue a new token if token is not approaching expiration', () => {
      const mockToken = 'token123';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      };
      const mockResponse = { setHeader: jest.fn() };
      
      // Current time
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Token that expires in a long time (more than 30% of lifetime remaining)
      const decodedToken = {
        exp: currentTime + 3600, // Expires in 1 hour
        iat: currentTime - 3600, // Issued 1 hour ago
        user_id: '123',
        user_email: 'test@example.com',
        user_roles: ['Designer'],
      };
      
      jest.spyOn(jwtService, 'decode').mockReturnValueOnce(decodedToken);
      
      // Use reflection to access private method
      const checkAndRefreshToken = (guard as any).checkAndRefreshToken.bind(guard);
      checkAndRefreshToken(mockRequest, mockResponse);
      
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
    });

    it('should issue a new token if token is approaching expiration', () => {
      const mockToken = 'token123';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      };
      const mockResponse = { setHeader: jest.fn() };
      
      // Current time
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Token that is about to expire (less than 30% of lifetime remaining)
      const decodedToken = {
        exp: currentTime + 300, // Expires in 5 minutes
        iat: currentTime - 3600, // Issued 1 hour ago
        user_id: '123',
        user_email: 'test@example.com',
        user_roles: ['Designer'],
      };
      
      const newToken = 'new-token-123';
      
      jest.spyOn(jwtService, 'decode').mockReturnValueOnce(decodedToken);
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce(newToken);
      
      // Use reflection to access private method
      const checkAndRefreshToken = (guard as any).checkAndRefreshToken.bind(guard);
      checkAndRefreshToken(mockRequest, mockResponse);
      
      expect(jwtService.sign).toHaveBeenCalledWith({
        user_id: '123',
        user_email: 'test@example.com',
        user_roles: ['Designer'],
      });
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-New-Access-Token', newToken);
    });

    it('should handle errors gracefully', () => {
      const mockToken = 'token123';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      };
      const mockResponse = { setHeader: jest.fn() };
      
      // Mock an error during token decoding
      jest.spyOn(jwtService, 'decode').mockImplementationOnce(() => {
        throw new Error('Token decode error');
      });
      
      // Spy on Logger.error
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      
      // Use reflection to access private method
      const checkAndRefreshToken = (guard as any).checkAndRefreshToken.bind(guard);
      
      // Should not throw an error
      expect(() => checkAndRefreshToken(mockRequest, mockResponse)).not.toThrow();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});