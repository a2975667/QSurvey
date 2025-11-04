import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { CoreService } from 'src/core/core.service';

const createUserModelMock = () => {
  const mock: any = jest.fn().mockImplementation(() => ({
    save: jest.fn(),
  }));

  mock.find = jest.fn().mockReturnValue({ exec: jest.fn() });
  mock.findOne = jest.fn().mockReturnValue({ exec: jest.fn() });
  mock.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn() });
  mock.findByIdAndRemove = jest.fn().mockReturnValue({ exec: jest.fn() });

  return mock;
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: createUserModelMock(),
        },
        {
          provide: CoreService,
          useValue: {
            getUserById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
