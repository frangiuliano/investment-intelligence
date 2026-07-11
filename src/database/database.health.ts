import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealth {
  constructor(private readonly dataSource: DataSource) {}

  async isUp(): Promise<boolean> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
