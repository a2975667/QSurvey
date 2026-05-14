import { Controller, Get, Param, Res, All } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { debugLog } from './config/runtime-flags';

@Controller({
  path: '', // empty path to match root
})
export class FrontendController {
  @Get()
  serveFrontend(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'build', 'index.html'));
  }

  @Get('survey/:id')
  serveSurvey(@Res() res: Response) {
    debugLog('[DEBUG] serveSurvey route handler called - serving index.html');
    res.sendFile(join(__dirname, '..', 'build', 'index.html'));
  }

  @Get('survey/:id/complete')
  serveSurveyComplete(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'build', 'index.html'));
  }

  @Get('designer')
  serveDesigner(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'build', 'index.html'));
  }

  @Get('login')
  serveLogin(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'build', 'index.html'));
  }

  @Get('home')
  serveHome(@Res() res: Response) {
    res.sendFile(join(__dirname, '..', 'build', 'index.html'));
  }
}
