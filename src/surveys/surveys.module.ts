import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Survey, SurveySchema } from 'src/schemas/survey.schema';
import { SurveysService } from './surveys.service';
import { SurveysController } from './surveys.controller';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { User, UserSchema } from 'src/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Survey.name, schema: SurveySchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
  ],
  providers: [UsersService, SurveysService],
  controllers: [SurveysController],
  exports: [],
})
export class SurveysModule {}
