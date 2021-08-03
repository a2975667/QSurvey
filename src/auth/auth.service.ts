import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CoreService } from 'src/core/core.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private coreService: CoreService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.coreService.getUserByEmail(email);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

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
        // message: 'User information from google',
        // user: req.user,
        status: 200,
        access_token: this.jwtService.sign(payload),
      };
    }
  }
}
