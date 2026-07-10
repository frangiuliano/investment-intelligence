import {
  Global,
  Inject,
  Injectable,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DATABASE_POOL } from './database.constants';
import { DatabaseHealth } from './database.health';

@Injectable()
class DatabasePoolShutdown implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        return new Pool({
          connectionString: configService.getOrThrow<string>('databaseUrl'),
        });
      },
    },
    DatabaseHealth,
    DatabasePoolShutdown,
  ],
  exports: [DATABASE_POOL, DatabaseHealth],
})
export class DatabaseModule {}
