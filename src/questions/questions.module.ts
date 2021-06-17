import { SurveysModule } from './../surveys/surveys.module';
import { Question, QuestionSchema } from './../schemas/question.schema';
import { QuestionsService } from './questions.service';
import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QvController } from './qv/qv.controller';
import { QvService } from './qv/qv.service';
import { MongooseModule } from '@nestjs/mongoose';
import { QVQuestion } from 'src/schemas/questions/qv/qv-question.schema';
import { QVQuestionSchema } from 'src/schemas/questions/qv/qv-question.schema';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { User, UserSchema } from 'src/schemas/user.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { Survey, SurveySchema } from 'src/schemas/survey.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: QVQuestion.name, schema: QVQuestionSchema },
      { name: User.name, schema: UserSchema },
      { name: Survey.name, schema: SurveySchema },
    ]),
    UsersModule,
    SurveysModule,
  ],
  controllers: [QuestionsController, QvController],
  providers: [UsersService, QuestionsService, QvService, SurveysService],
  exports: [],
})
export class QuestionsModule {}
