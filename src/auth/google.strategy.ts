import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { UsersService } from '../users/users.service';
import { Injectable } from '@nestjs/common';
import { Role } from './roles/role.enum';
import { CoreService } from 'src/core/core.service';

config();

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private coreService: CoreService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENTID'),
      clientSecret: configService.get('GOOGLE_SECRET'),
      callbackURL: configService.get('REDIRECT_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      profilePictureURI: photos[0].value,
      roles: [Role.Designer],
      accessToken,
    };

    let fetchedUser = await this.coreService.getUserByEmail(user.email);

    if (fetchedUser) {
      // keeps profile picture up-to-date
      if (fetchedUser.profilePictureURI !== user.profilePictureURI) {
        fetchedUser = await this.usersService.updateUserPicByEmail(
          fetchedUser.email,
          user.profilePictureURI,
        );
      }

      done(null, fetchedUser);
    } else {
      const newUser = await this.usersService.createNewUser(user);
      done(null, newUser);
    }
  }
}
