import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { UsersController } from './users.controller';
import { ProtectedUsersController } from './protected-users.controller';
import { UsersService } from './users.service';

describe('profile role boundary', () => {
  let app: INestApplication;
  let updateUserbyId: jest.Mock;
  const userId = '507f191e810c19729de860ea';

  beforeEach(async () => {
    updateUserbyId = jest.fn().mockResolvedValue({ _id: userId, roles: [Role.Designer] });
    const module = await Test.createTestingModule({
      controllers: [UsersController, ProtectedUsersController],
      providers: [{ provide: UsersService, useValue: { updateUserbyId } }],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate: (context: any) => {
        context.switchToHttp().getRequest().user = { userId, roles: [Role.Designer] };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterEach(async () => app.close());

  it('preserves editable profile fields and strips self-assigned admin roles', async () => {
    const profile = { email: 'user@example.test', firstName: 'First', lastName: 'Last', profilePictureURI: 'https://example.test/avatar.png', surveys: [] };
    await request(app.getHttpServer()).put('/api/v1/profiles')
      .send({ ...profile, roles: [Role.Admin] }).expect(200);
    expect(updateUserbyId).toHaveBeenCalledWith(userId, profile);
  });

  it.each([
    { roles: [Role.Admin] },
    { $set: { roles: [Role.Admin] } },
    { $push: { roles: Role.Admin } },
  ])('never forwards role mutations or Mongo update operators: %j', async (payload) => {
    await request(app.getHttpServer()).put('/api/v1/profiles').send(payload).expect(200);
    expect(updateUserbyId).toHaveBeenCalledWith(userId, {});
  });

  it('keeps the actual admin role guard on the separate role-management route', async () => {
    await request(app.getHttpServer()).put(`/api/v1/protected/profiles/${userId}`)
      .send({ roles: [Role.Admin] }).expect(403);
    expect(updateUserbyId).not.toHaveBeenCalled();
  });
});
