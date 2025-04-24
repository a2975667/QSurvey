import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JWT Token Auto-Refresh', () => {
  let jwtService: JwtService;
  let configService: ConfigService;
  let jwtAuthGuard: JwtAuthGuard;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            decode: jest.fn(),
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

    jwtService = moduleRef.get<JwtService>(JwtService);
    jwtAuthGuard = moduleRef.get<JwtAuthGuard>(JwtAuthGuard);
  });

  describe('Token refresh logic', () => {
    it('should refresh token when it is about to expire', () => {
      // Create a mock context
      const mockUser = { userId: '123', username: 'test@example.com', roles: ['Admin'] };
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Token that is about to expire (less than 30% of lifetime remaining)
      const decodedToken = {
        exp: currentTime + 300, // Expires in 5 minutes
        iat: currentTime - 3600, // Issued 1 hour ago
        user_id: '123',
        user_email: 'test@example.com',
        user_roles: ['Admin'],
      };
      
      const mockToken = 'expiring-token-123';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        user: null,
      };
      
      const mockResponse = {
        setHeader: jest.fn(),
      };
      
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;
      
      // Set up mock responses
      const newToken = 'new-refreshed-token-456';
      jest.spyOn(jwtService, 'decode').mockReturnValueOnce(decodedToken);
      jest.spyOn(jwtService, 'sign').mockReturnValueOnce(newToken);
      
      // Call the guard
      const result = jwtAuthGuard.handleRequest(null, mockUser, null, mockContext);
      
      // Verify expectations
      expect(result).toBe(mockUser);
      expect(mockRequest.user).toBe(mockUser);
      expect(jwtService.decode).toHaveBeenCalledWith(mockToken);
      expect(jwtService.sign).toHaveBeenCalledWith({
        user_id: '123',
        user_email: 'test@example.com',
        user_roles: ['Admin'],
      });
      
      // Check for token refresh header
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-New-Access-Token', newToken);
      
      // Check for security headers
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      // Check for cache control headers
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    });
    
    it('should not refresh token when it has plenty of time until expiration', () => {
      // Create a mock context
      const mockUser = { userId: '123', username: 'test@example.com', roles: ['Admin'] };
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Token that is far from expiration (more than 30% of lifetime remaining)
      const decodedToken = {
        exp: currentTime + 3600, // Expires in 1 hour
        iat: currentTime - 1800, // Issued 30 minutes ago
        user_id: '123',
        user_email: 'test@example.com',
        user_roles: ['Admin'],
      };
      
      const mockToken = 'valid-token-123';
      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
        user: null,
      };
      
      const mockResponse = {
        setHeader: jest.fn(),
      };
      
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as ExecutionContext;
      
      // Set up mock responses
      jest.spyOn(jwtService, 'decode').mockReturnValueOnce(decodedToken);
      
      // Call the guard
      const result = jwtAuthGuard.handleRequest(null, mockUser, null, mockContext);
      
      // Verify expectations
      expect(result).toBe(mockUser);
      expect(mockRequest.user).toBe(mockUser);
      expect(jwtService.decode).toHaveBeenCalledWith(mockToken);
      expect(jwtService.sign).not.toHaveBeenCalled();
      
      // Should still have security headers
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      // But should not have token refresh or cache control headers
      expect(mockResponse.setHeader).not.toHaveBeenCalledWith('X-New-Access-Token', expect.any(String));
      expect(mockResponse.setHeader).not.toHaveBeenCalledWith('Cache-Control', expect.any(String));
      expect(mockResponse.setHeader).not.toHaveBeenCalledWith('Pragma', expect.any(String));
    });
  });
});