import { Test, TestingModule } from '@nestjs/testing';
import {
  ValidationPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ProtectedUsersController } from './protected-users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { LookupUserByEmailDto } from './dtos/lookupUserByEmail.dto';

describe('ProtectedUsersController (lookupUserByEmail)', () => {
  let controller: ProtectedUsersController;
  let usersService: any;
  let validationPipe: ValidationPipe;

  beforeEach(async () => {
    usersService = {
      findUserByEmailCaseInsensitive: jest.fn(),
      findAllUsers: jest.fn(),
      findUserById: jest.fn(),
      updateUserbyId: jest.fn(),
      removeUserById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProtectedUsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = moduleRef.get<ProtectedUsersController>(
      ProtectedUsersController,
    );
    validationPipe = new ValidationPipe({ transform: true, whitelist: true });
  });

  const toDto = async (
    query: Record<string, any>,
  ): Promise<LookupUserByEmailDto> => {
    return (await validationPipe.transform(query, {
      type: 'query',
      metatype: LookupUserByEmailDto,
    })) as LookupUserByEmailDto;
  };

  it('returns userId and email when lookup succeeds and trims input', async () => {
    const userId = new Types.ObjectId();
    usersService.findUserByEmailCaseInsensitive.mockResolvedValue({
      _id: userId,
      email: 'user@example.com',
    });

    const dto = await toDto({ email: '  user@example.com  ' });
    const result = await controller.lookupUserByEmail(dto);

    expect(usersService.findUserByEmailCaseInsensitive).toHaveBeenCalledWith(
      'user@example.com',
    );
    expect(result).toEqual({
      userId: userId.toString(),
      email: 'user@example.com',
    });
  });

  it('throws BadRequestException for invalid email', async () => {
    await expect(toDto({ email: 'not-an-email' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(usersService.findUserByEmailCaseInsensitive).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when email is missing', async () => {
    await expect(toDto({})).rejects.toBeInstanceOf(BadRequestException);
    expect(usersService.findUserByEmailCaseInsensitive).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when user is not found', async () => {
    usersService.findUserByEmailCaseInsensitive.mockResolvedValue(null);

    const dto = await toDto({ email: 'missing@example.com' });
    await expect(controller.lookupUserByEmail(dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
