import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CoreService } from 'src/core/core.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private coreService: CoreService,
  ) {}

  googleLogin(req) {
    if (!req.user) {
      return {
        status: -1,
        message: 'Login Error. Please reach out to the developers.',
      };
    } else {
      const payload = {
        user_id: req.user._id,
        user_email: req.user.email,
        user_roles: req.user.roles,
      };
      return {
        // Include user information with the token
        status: 200,
        user: {
          id: req.user._id,
          email: req.user.email,
          roles: req.user.roles
        },
        access_token: this.jwtService.sign(payload),
      };
    }
  }
}
