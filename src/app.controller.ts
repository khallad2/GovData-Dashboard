import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
@Controller()
export class AppController {
  constructor() {}

  @Get('/')
  getHello(@Res() res: Response): void {
    // Serve the index.html file from the 'public' folder
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
  }
}
