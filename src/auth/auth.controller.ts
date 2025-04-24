import { AuthService } from './auth.service';
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

@Controller('api/v1')
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
    // Get login data
    const loginData = this.authService.googleLogin(req);
    
    // Add login data as query parameters directly in the redirect URL
    // This avoids cookie encoding/decoding issues
    const params = new URLSearchParams();
    params.append('token', loginData.access_token);
    if (loginData.user) {
      params.append('email', loginData.user.email);
      params.append('userId', loginData.user.id);
      params.append('roles', JSON.stringify(loginData.user.roles));
    }
    
    // Log the redirect for debugging
    console.log('Google Auth redirect completed, redirecting to frontend');
    
    // Redirect with query parameters
    res.redirect(`http://localhost:3000/login-success?${params.toString()}`);
  }
}
