import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Body, UseGuards } from '@nestjs/common';
import { Controller, Delete, Get, Param, Put, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { Types } from 'mongoose';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { UsersService } from './users.service';
import { isEmail } from 'class-validator';

@ApiBearerAuth()
@ApiTags('Protected APIs: User')
@Controller('api/v1/protected/profiles')
export class ProtectedUsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('lookup')
  async lookupUserByEmail(@Query('email') emailParam: string) {
    const email = typeof emailParam === 'string' ? emailParam.trim() : '';
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    if (!isEmail(email)) {
      throw new BadRequestException(
        'Email is invalid. Please enter a valid email address.',
      );
    }

    const user = await this.usersService.findUserByEmailCaseInsensitive(email);
    if (!user) {
      throw new NotFoundException(
        'No account found for that email. Ask them to sign up, then try again.',
      );
    }
    return { userId: (user as any)._id?.toString?.() ?? '', email: user.email };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id')
  getUserById(@Param('id') userId: Types.ObjectId) {
    return this.usersService.findUserById(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Put(':id')
  updateUserById(
    @Param('id') id: Types.ObjectId,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserbyId(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  deleteUserId(@Param('id') userId: Types.ObjectId) {
    return this.usersService.removeUserById(userId);
  }
}
