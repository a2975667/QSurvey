import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name)
    private surveyModel: Model<SurveyDocument>,
  ) {}

  async findSurveyById(id: string): Promise<Survey | undefined> {
    return this.surveyModel.findOne({ _id: id }).exec();
  }

  async createNewSurvey(createSurveyDto: CreateSurveyDto): Promise<Survey> {
    const createdSurvey = new this.surveyModel(createSurveyDto);
    return createdSurvey.save();
  }

  async updateSurveyById(id: string, updateSurveyDto: UpdateSurveyDto) {
    return this.surveyModel
      .findByIdAndUpdate(id, updateSurveyDto, { returnOriginal: false })
      .exec();
  }

  async removeSurveyById(id: string): Promise<Survey | undefined> {
    return this.surveyModel.findByIdAndRemove(id).exec();
  }
}
