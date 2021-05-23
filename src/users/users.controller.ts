import { Controller, Get, Put, Delete } from '@nestjs/common';

@Controller()
export class UsersController {
  @Get()
  getUserById() {
    return 'Pass';
  }

  @Get()
  getUserByUserId() {
    return 'Pass';
  }

  @Put()
  updateUserById() {
    return 'Pass';
  }

  @Delete()
  deleteUserId() {
    return 'Pass';
  }
}
