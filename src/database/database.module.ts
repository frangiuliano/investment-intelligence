import {
  Global,
  Injectable,
  Logger,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseHealth } from './database.health';

@Injectable()
class DatabaseConnectionBootstrap implements OnModuleInit {
  private readonly logger = new Logger(DatabaseConnectionBootstrap.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    if (this.dataSource.isInitialized) {
      return;
    }

    try {
      await this.dataSource.initialize();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `PostgreSQL unavailable at boot (${message}). App stays up; GET /health will report database down until it connects.`,
      );
    }
  }
}

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.getOrThrow<string>('databaseUrl'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
        retryAttempts: 0,
        manualInitialization: true,
      }),
    }),
  ],
  providers: [DatabaseHealth, DatabaseConnectionBootstrap],
  exports: [TypeOrmModule, DatabaseHealth],
})
export class DatabaseModule {}
