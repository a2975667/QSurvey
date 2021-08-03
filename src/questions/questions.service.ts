import { classToPlain, plainToClass } from 'class-transformer';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Question, QuestionDocument } from './../schemas/question.schema';
import { Role } from 'src/auth/roles/role.enum';
import { SurveysService } from 'src/surveys/surveys.service';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';
import { UsersService } from 'src/users/users.service';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    private usersService: UsersService,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async getAllQuestions(
    userId: Types.ObjectId,
  ): Promise<Question[] | undefined> {
    const userInfo = await this.usersService.findUserById(userId);
    if (!userInfo.roles.includes(Role.Admin)) {
      throw new UnauthorizedException('This is an Admin only permission');
    }
    return await this.questionModel.find().exec();
  }

  async getQuestionById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    questionId: string,
  ): Promise<Question | undefined> {
    const userInfo = await this.usersService.findUserById(userId);
    if (
      !userInfo.roles.includes(Role.Admin) &&
      !userInfo.surveys.includes(surveyId)
    ) {
      throw new UnauthorizedException();
    }
    return await this.questionModel.findOne({ _id: questionId }).exec();
  }

  async removeQuestionById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    questionId: Types.ObjectId,
  ) {
    const user = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(user, survey);

    let surveyQuestions = survey.questions;

    surveyQuestions = surveyQuestions.filter((n) => {
      return n != questionId;
    });
    const updateSurveyQuestionsDto = plainToClass(UpdateSurveyQuestionsDto, {
      questions: surveyQuestions,
    });
    await this.surveysService.updateSurveyQuestionsById(
      userId,
      surveyId,
      updateSurveyQuestionsDto,
    );
    //need to remove question from survey
    const deletedQuestion = await this.questionModel
      .findByIdAndRemove(classToPlain(questionId).toString())
      .exec();
    if (deletedQuestion) {
      return await this.coreService.getSurveyById(surveyId);
    } else {
      throw new BadRequestException('Cannot Find QuestionId. [QS0072]');
    }
  }
}
