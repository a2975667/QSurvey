import { QuestionsService } from './questions.service';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Delete } from '@nestjs/common';
import { CreateQVQuestionDto } from './dtos/createQVQuestion.dto';

@Controller('questions/:type')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  // @Get(':id')
  // getQuestionById(@Param('type') type: string, @Param('id') id: string) {
  //   return 'question id: ' + id + type;
  // }
}
