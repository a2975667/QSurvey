import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from 'src/auth/roles/role.enum';
import { UsersService } from 'src/users/users.service';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import { UpdateUserDto } from 'src/users/dtos/updateUser.dto';
import { plainToClass } from 'class-transformer';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name)
    private surveyModel: Model<SurveyDocument>,
    private usersService: UsersService,
  ) {}

  async getAllSurveys(): Promise<Survey[] | undefined> {
    return this.surveyModel.find().exec();
  }

  async findSurveyById(
    userid: string,
    id: string,
  ): Promise<Survey | undefined> {
    const userInfo = await this.usersService.findUserById(userid);
    if (userInfo.roles.includes(Role.Admin) || userInfo.surveys.includes(id)) {
      return await this.surveyModel.findOne({ _id: id }).exec();
    } else {
      throw new UnauthorizedException();
    }
  }

  async createNewSurvey(
    userid: string,
    createSurveyDto: CreateSurveyDto,
  ): Promise<Survey> {
    const createdSurvey = new this.surveyModel(createSurveyDto);
    createdSurvey.collaborators = [...createdSurvey.collaborators, userid];
    const completeCreatedSurvey = await createdSurvey.save();
    let usersurvey = await (await this.usersService.findUserById(userid))
      .surveys;
    usersurvey = [...usersurvey, completeCreatedSurvey._id];
    const updateUserDto = plainToClass(UpdateUserDto, { surveys: usersurvey });
    await this.usersService.updateUserbyId(userid, updateUserDto);
    return completeCreatedSurvey;
  }

  async updateSurveyById(
    userid: string,
    id: string,
    updateSurveyDto: UpdateSurveyDto,
  ) {
    const userInfo = await this.usersService.findUserById(userid);
    if (userInfo.roles.includes(Role.Admin) || userInfo.surveys.includes(id)) {
      return await this.surveyModel
        .findByIdAndUpdate(id, updateSurveyDto, { returnOriginal: false })
        .exec();
    } else {
      throw new UnauthorizedException();
    }
  }

  async removeSurveyById(
    userid: string,
    id: string,
  ): Promise<Survey | undefined> {
    const userInfo = await this.usersService.findUserById(userid);
    console.log(userInfo);
    if (userInfo.roles.includes(Role.Admin) || userInfo.surveys.includes(id)) {
      const collaborators = await (
        await this.surveyModel.findOne({ _id: id }).exec()
      ).collaborators;

      await Promise.all(
        collaborators.map(async (uid) => {
          const currUserSurveys = (await this.usersService.findUserById(uid))
            .surveys;
          const updateUserDto = plainToClass(UpdateUserDto, {
            surveys: currUserSurveys.filter((n) => {
              return n != id;
            }),
          });
          await this.usersService.updateUserbyId(userid, updateUserDto);
        }),
      );
      return await this.surveyModel.findByIdAndRemove(id).exec();
    } else {
      throw new UnauthorizedException();
    }
  }
}
