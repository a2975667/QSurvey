import { UsersService } from './users.service';
import { Controller, Get, Put, Delete, Param, Body } from '@nestjs/common';
import { UpdateUserDto } from './dtos/updateUser.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.findUserById(id);
  }

  // @Get()
  // getUserByUserId() {
  //   return 'Pass';
  // }

  @Put(':id')
  updateUserById(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserbyId(id, updateUserDto);
  }

  @Delete(':id')
  deleteUserId(@Param('id') id: string) {
    return this.usersService.removeUserById(id);
  }
}
