import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { CoreServiceMock } from './mocks/core.service.mock';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let coreService: CoreServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-token'),
          },
        },
        {
          provide: 'CoreService',
          useClass: CoreServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    coreService = module.get<CoreService>(CoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('googleLogin', () => {
    it('should return login error if no user', () => {
      const req = { user: null };
      const result = service.googleLogin(req);
      expect(result.status).toBe(-1);
      expect(result.message).toBe('Login Error. Please reach out to the developers.');
    });

    it('should return access token if user exists', () => {
      const mockUser = {
        _id: 'test-id',
        email: 'test@example.com',
        roles: ['Designer'],
      };
      const req = { user: mockUser };
      
      const result = service.googleLogin(req);
      
      expect(result.status).toBe(200);
      expect(result.access_token).toBe('test-token');
      expect(jwtService.sign).toHaveBeenCalledWith({
        user_id: mockUser._id,
        user_email: mockUser.email,
        user_roles: mockUser.roles,
      });
    });
  });
});
