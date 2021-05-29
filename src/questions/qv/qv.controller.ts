import { UpdateQVQuestionDto } from './../dtos/updateQVQuestion.dto';
import { CreateQVQuestionDto } from './../dtos/createQVQuestion.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { QvService } from './qv.service';
@Controller('qv')
export class QvController {
  constructor(private qvService: QvService) {}

  @Post()
  createQVQuestion(@Body() createQVQuestionDto: CreateQVQuestionDto) {
    // return createQVQuestionDto;
    return this.qvService.createQVQuestion(createQVQuestionDto);
  }

  @Put(':id')
  updateQVQuestion(
    @Param('id') id: string,
    @Body() updateQVQuestionDto: UpdateQVQuestionDto,
  ) {
    return this.qvService.updateQVQuestionbyId(id, updateQVQuestionDto);
  }

  @Put('appendResponse/:id')
  addQVQuestionResponse(@Param('id') id: string, @Body() response: string) {
    return this.qvService.appendResponseToQuestionbyId(id, response);
  }

  @Delete(':id')
  deleteQVQuestion(@Param('id') id: string) {
    return this.qvService.removeQVQuestionbyId(id);
  }

  @Get(':id')
  findQVQuestionById(@Param('id') id: string) {
    return this.qvService.findQVQuestionById(id);
  }
}
