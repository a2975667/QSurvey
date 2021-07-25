import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProtectedUsersController } from './protected-users.controller';
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [UsersController, ProtectedUsersController],
  providers: [UsersService],
  exports: [],
})
export class UsersModule {}
