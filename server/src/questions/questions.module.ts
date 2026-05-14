import { SurveysModule } from './../surveys/surveys.module';
import { Question, QuestionSchema } from './schemas/question.schema';
import { QuestionsService } from './questions.service';
import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QvController } from './qv/qv.controller';
import { QvService } from './qv/qv.service';
import { LikertController } from './likert/likert.controller';
import { LikertService } from './likert/likert.service';
import { TextController } from './text/text.controller';
import { TextService } from './text/text.service';
import { TextBlockController } from './textBlock/text-block.controller';
import { TextBlockService } from './textBlock/text-block.service';
import { MongooseModule } from '@nestjs/mongoose';
import { QVQuestion, QVQuestionSchema } from './schemas/qv/qv-question.schema';
import { LikertQuestion, LikertQuestionSchema } from './schemas/likert/likert.question.schema';
import { TextInputQuestion, TextInputQuestionSchema } from './schemas/textInput/text-input.question.schema';
import { TextBlockQuestion, TextBlockQuestionSchema } from './schemas/textBlock/text-block.question.schema';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Survey, SurveySchema } from 'src/surveys/schemas/survey.schema';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { ApprovalQuestionController } from './approval/approval-question.controller';
import { ApprovalQuestionService } from './approval/approval-question.service';
import { ApprovalQuestion, ApprovalQuestionSchema } from './schemas/approval/approval-question.schema';
import { SelectionQuestion, SelectionQuestionSchema } from './schemas/selection/selection-question.schema';
import { SelectionQuestionController } from './selection/selection-question.controller';
import { SelectionQuestionService } from './selection/selection-question.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Question.name, schema: QuestionSchema },
      { name: QVQuestion.name, schema: QVQuestionSchema },
      { name: LikertQuestion.name, schema: LikertQuestionSchema },
      { name: TextInputQuestion.name, schema: TextInputQuestionSchema },
      { name: TextBlockQuestion.name, schema: TextBlockQuestionSchema },
      { name: ApprovalQuestion.name, schema: ApprovalQuestionSchema },
      { name: SelectionQuestion.name, schema: SelectionQuestionSchema },
      { name: User.name, schema: UserSchema },
      { name: Survey.name, schema: SurveySchema },
    ]),
    UsersModule,
    SurveysModule,
    ConfigModule,
    JwtModule,
    AuthModule,
  ],
  controllers: [
    QuestionsController,
    QvController,
    LikertController,
    TextController,
    TextBlockController,
    ApprovalQuestionController,
    SelectionQuestionController,
  ],
  providers: [
    UsersService,
    QuestionsService,
    QvService,
    LikertService,
    TextService,
    TextBlockService,
    ApprovalQuestionService,
    SelectionQuestionService,
  ],
  exports: [],
})
export class QuestionsModule {}
