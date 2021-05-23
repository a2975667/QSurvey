import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GoogleAuthGuard } from './auth/google-auth.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private authService: AuthService,
  ) {}

  @Get('api')
  getHello(): string {
    return this.appService.getHello();
  }

  // @UseGuards(GoogleAuthGuard)
  // @Get('auth/login')
  // async login(@Request() req) {
  //   return this.authService.googleLogin(req.user);
  // }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
