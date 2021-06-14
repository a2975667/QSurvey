import { QuestionsService } from './questions.service';
import { Controller } from '@nestjs/common';

@Controller('questions/:type')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  // @Get(':id')
  // getQuestionById(@Param('type') type: string, @Param('id') id: string) {
  //   return 'question id: ' + id + type;
  // }
}
