import { UsersService } from './users.service';
import { Controller, Get, Put, Delete, Param } from '@nestjs/common';
import { Body, UseGuards, Request } from '@nestjs/common';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { Role } from 'src/auth/roles/role.enum';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
@ApiBearerAuth()
@Controller('profile')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('all')
  getAllUsers() {
    return this.usersService.findAllUsers();
  }

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
    return this.usersService.updateUserbyId(userid, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Delete()
  deleteUserProfile(@Request() req) {
    const userid = req.user.userId;
    return this.usersService.removeUserById(userid);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Put(':id')
  updateUserById(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserbyId(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Delete(':id')
  deleteUserId(@Param('id') id: string) {
    return this.usersService.removeUserById(id);
  }
}
