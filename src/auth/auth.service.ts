import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

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
      return {
        message: 'User information from google',
        user: req.user,
      };
    }
  }
}
