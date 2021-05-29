import { QuestionsService } from './questions.service';
import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QvController } from './qv/qv.controller';
import { QvService } from './qv/qv.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  QVQuestion,
  QVQuestionSchema,
} from 'src/schemas/questions/qv/qv.question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QVQuestion.name, schema: QVQuestionSchema },
    ]),
  ],
  controllers: [QuestionsController, QvController],
  providers: [QuestionsService, QvService],
  exports: [QvService, QuestionsService],
})
export class QuestionsModule {}
