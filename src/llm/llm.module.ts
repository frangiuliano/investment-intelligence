import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GEMINI_LLM_PROVIDER,
  GeminiLlmAdapter,
} from './adapters/gemini-llm.adapter';
import { LLM_CLIENT, LlmClient } from './llm.port';

@Module({
  providers: [
    GeminiLlmAdapter,
    {
      provide: LLM_CLIENT,
      inject: [ConfigService, GeminiLlmAdapter],
      useFactory: (
        configService: ConfigService,
        geminiAdapter: GeminiLlmAdapter,
      ): LlmClient => {
        const provider = configService.getOrThrow<string>('llm.provider');
        if (provider !== GEMINI_LLM_PROVIDER) {
          throw new Error(
            `Unsupported LLM provider: ${provider}. Supported: ${GEMINI_LLM_PROVIDER}`,
          );
        }
        return geminiAdapter;
      },
    },
  ],
  exports: [LLM_CLIENT],
})
export class LlmModule {}
