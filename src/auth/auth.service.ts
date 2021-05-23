import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findUserByEmail(username);
    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  googleLogin(req) {
    if (!req.user) {
      return {
        message: 'Login Error. Please reach out to the developers.',
      };
    } else {
      // TODO: Create Cookie and maintain login status.
      // Redirects to survey lists.
      const payload = {
        user_id: req.user._id,
        user_email: req.user.email,
      };
      return {
        // message: 'User information from google',
        // user: req.user,
        access_token: this.jwtService.sign(payload),
      };
    }
  }
}
