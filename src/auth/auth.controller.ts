import { AuthService } from './auth.service';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google-login')
  @ApiTags('User Profiles')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    return req.user;
  }

  @Get('redirect')
  @ApiTags('Internal Calls')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req, @Res() res) {
    res.cookie(
      'login_payload',
      JSON.stringify(this.authService.googleLogin(req)),
    );

    if (this.configService.get('mode') === 'backend') {
      res.redirect('http://localhost:5000/api/v1');
      console.log(this.authService.googleLogin(req));
    } else {
      res.redirect('http://localhost:4200/login-sucess');
    }
  }
}
