import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DatabaseHealth } from '../database/database.health';

@Controller('health')
export class HealthController {
  constructor(private readonly databaseHealth: DatabaseHealth) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const databaseUp = await this.databaseHealth.isUp();

    if (!databaseUp) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        checks: {
          app: 'up',
          database: 'down',
        },
      });
      return;
    }

    res.status(HttpStatus.OK).json({
      status: 'ok',
      checks: {
        app: 'up',
        database: 'up',
      },
    });
  }
}
