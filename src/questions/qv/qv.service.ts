import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { QVQuestionDocument } from 'src/schemas/questions/qv/qv.question.schema';
import { QVQuestion } from 'src/schemas/questions/qv/qv.question.schema';
import { CreateQVQuestionDto } from '../dtos/createQVQuestion.dto';
import { UpdateQVQuestionDto } from '../dtos/updateQVQuestion.dto';

@Injectable()
export class QvService {
  constructor(
    @InjectModel(QVQuestion.name)
    private QVQuestionModel: Model<QVQuestionDocument>,
  ) {}

  async findQVQuestionById(id: string): Promise<QVQuestion | undefined> {
    return this.QVQuestionModel.findOne({ _id: id }).exec();
  }

  async updateQVQuestionbyId(
    id: string,
    updateQVQuestionDto: UpdateQVQuestionDto,
  ): Promise<QVQuestion> {
    const updateDocument = {
      ...updateQVQuestionDto,
      type: 'qv',
      response: undefined,
      setting: {
        ...updateQVQuestionDto.setting,
        version: undefined,
        questionType: undefined,
      },
    };
    return this.QVQuestionModel.findByIdAndUpdate(id, updateDocument, {
      returnOriginal: false,
    }).exec();
  }

  async createQVQuestion(
    createQVQuestionDto: CreateQVQuestionDto,
  ): Promise<QVQuestion> {
    const createDocument = {
      ...createQVQuestionDto,
      type: 'qv',
      response: undefined,
      setting: {
        ...createQVQuestionDto.setting,
        version: undefined,
        questionType: undefined,
      },
    };

    const createdQVQuestion = new this.QVQuestionModel(createDocument);
    return createdQVQuestion.save();
  }

  async removeQVQuestionbyId(id: string): Promise<QVQuestion> {
    return this.QVQuestionModel.findByIdAndRemove(id).exec();
  }

  async appendResponseToQuestionbyId(
    id: string,
    responseId: string,
  ): Promise<QVQuestion> {
    const response = responseId['response'];
    return this.QVQuestionModel.findByIdAndUpdate(
      id,
      { $push: { responses: response } },
      { returnOriginal: false },
    );
  }
}
