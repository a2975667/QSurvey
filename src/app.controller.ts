import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private authService: AuthService,
  ) {}

  @Get()
  @ApiTags('Default')
  @ApiResponse({
    status: 200,
    description: 'The backend server is working as intended.',
  })
  getHello(): string {
    return this.appService.getHello();
  }

  // @UseGuards(GoogleAuthGuard)
  // @Get('auth/login')
  // async login(@Request() req) {
  //   return this.authService.googleLogin(req.user);
  // }

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(Role.Admin, Role.Designer)
  // @Get('profile')
  // getProfile(@Request() req) {
  //   return req.user;
  // }
}
