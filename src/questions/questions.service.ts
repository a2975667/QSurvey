import { SurveysService } from 'src/surveys/surveys.service';
import { Question, QuestionDocument } from './../schemas/question.schema';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Role } from 'src/auth/roles/role.enum';
import { UsersService } from 'src/users/users.service';
import { classToPlain, plainToClass } from 'class-transformer';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    private usersService: UsersService,
    private surveysService: SurveysService,
  ) {}

  async getAllQuestions(userId: string): Promise<Question[] | undefined> {
    const userInfo = await this.usersService.findUserById(userId);
    if (!userInfo.roles.includes(Role.Admin)) {
      throw new UnauthorizedException('This is an Admin only permission');
    }
    return await this.questionModel.find().exec();
  }

  async getQuestionById(
    userId: string,
    surveyId: Types.ObjectId,
    questionId: string,
  ): Promise<Question | undefined> {
    const userInfo = await this.usersService.findUserById(userId);
    if (
      !userInfo.roles.includes(Role.Admin) &&
      !userInfo.surveys.includes(surveyId.toHexString())
    ) {
      throw new UnauthorizedException();
    }
    return await this.questionModel.findOne({ _id: questionId }).exec();
  }

  async removeQuestionById(
    userid: string,
    surveyId: Types.ObjectId,
    questionId: Types.ObjectId,
  ) {
    const userInfo = await this.usersService.findUserById(userid);
    let surveyQuestions = (
      await this.surveysService.findSurveyById(
        userid,
        classToPlain(surveyId).toString(),
      )
    ).questions;
    if (
      !userInfo.roles.includes(Role.Admin) &&
      !userInfo.surveys.includes(surveyId.toHexString())
    ) {
      throw new UnauthorizedException();
    }
    surveyQuestions = surveyQuestions.filter((n) => {
      return n != questionId;
    });
    const updateSurveyQuestionsDto = plainToClass(UpdateSurveyQuestionsDto, {
      questions: surveyQuestions,
    });
    await this.surveysService.updateSurveyQuestionsById(
      userid,
      classToPlain(surveyId).toString(),
      updateSurveyQuestionsDto,
    );
    //need to remove question from survey
    const deletedQuestion = await this.questionModel
      .findByIdAndRemove(classToPlain(questionId).toString())
      .exec();
    if (deletedQuestion) {
      return await this.surveysService.findSurveyById(
        userid,
        classToPlain(surveyId).toString(),
      );
    } else {
      throw new BadRequestException('Cannot Find QuestionId. [QS0072]');
    }
  }
}
