import { Body, Request, UseGuards } from '@nestjs/common';
import { Controller, Delete, Get, Put } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { UsersService } from './users.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
@ApiBearerAuth()
@ApiTags('User Profiles')
@Controller('api/v1/profiles')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ApiOkResponse({
    description: 'Returns personal profile or empty profile if not found',
  })
  @ApiBadRequestResponse({ description: 'Invalid UserId' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get()
  getUserProfile(@Request() req) {
    const userid = req.user.userId;
    return this.usersService.findUserById(userid);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put()
  updateUserProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const userid = req.user.userId;
    // Self-service profile edits must not grant roles or forward Mongo update
    // operators. Role changes remain on the existing admin-only endpoint.
    const profileUpdate = {} as UpdateUserDto;
    for (const field of ['email', 'firstName', 'lastName', 'profilePictureURI', 'surveys'] as const) {
      if (Object.prototype.hasOwnProperty.call(updateUserDto, field)) {
        profileUpdate[field] = updateUserDto[field] as any;
      }
    }
    return this.usersService.updateUserbyId(userid, profileUpdate);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Delete()
  deleteUserProfile(@Request() req) {
    const userid = req.user.userId;
    return this.usersService.removeUserById(userid);
  }
}
