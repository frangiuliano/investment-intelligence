import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import path from 'node:path';
import {
  DEFAULT_KNOWLEDGE_CONTEXT_MAX_CHARS,
  DEFAULT_KNOWLEDGE_ROOT,
} from './knowledge.constants';
import {
  assembleKnowledgeMarkdown,
  loadKnowledgePackFromDisk,
  LoadedKnowledgePack,
} from './knowledge-pack.loader';
import {
  resolvePlaybookAssetType,
  selectRubricIds,
} from './knowledge-pack.selector';
import {
  KnowledgeChunk,
  KnowledgePackResult,
  KnowledgeSelectQuery,
} from './knowledge.types';

@Injectable()
export class KnowledgePackService {
  private readonly logger = new Logger(KnowledgePackService.name);
  private cache: LoadedKnowledgePack | null = null;

  constructor(private readonly configService: ConfigService) {}

  async buildInjection(
    query: KnowledgeSelectQuery,
  ): Promise<KnowledgePackResult> {
    const pack = await this.getPack();
    if (!pack) {
      return { injection: null, knowledgeVersion: null };
    }

    const chunks = this.selectChunks(pack, query);
    if (chunks.length === 0) {
      return { injection: null, knowledgeVersion: null };
    }

    const maxChars = this.configService.get<number>(
      'knowledge.maxContextChars',
    );
    const assembled = assembleKnowledgeMarkdown(
      chunks,
      maxChars ?? DEFAULT_KNOWLEDGE_CONTEXT_MAX_CHARS,
    );

    if (!assembled.markdown.trim()) {
      return { injection: null, knowledgeVersion: null };
    }

    return {
      knowledgeVersion: pack.knowledgeVersion,
      injection: {
        knowledgeVersion: pack.knowledgeVersion,
        matchedIds: assembled.matchedIds,
        markdown: assembled.markdown,
        truncated: assembled.truncated,
      },
    };
  }

  private selectChunks(
    pack: LoadedKnowledgePack,
    query: KnowledgeSelectQuery,
  ): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];
    const assetType = resolvePlaybookAssetType(query);
    const playbook = pack.playbooksByAssetType.get(assetType);
    if (playbook) {
      chunks.push(playbook);
    } else {
      this.logger.warn(
        `No playbook for assetType=${assetType}; continuing without playbook`,
      );
    }

    for (const rubricId of selectRubricIds(query)) {
      const rubric = pack.rubricsById.get(rubricId);
      if (rubric) {
        chunks.push(rubric);
      } else {
        this.logger.warn(`Knowledge rubric not found: ${rubricId}`);
      }
    }

    return chunks;
  }

  private async getPack(): Promise<LoadedKnowledgePack | null> {
    if (this.cache) {
      return this.cache;
    }

    const root = this.resolveRoot();
    try {
      this.cache = await loadKnowledgePackFromDisk(root);
      this.logger.log(
        `Loaded Knowledge Pack v${this.cache.knowledgeVersion} from ${root}`,
      );
      return this.cache;
    } catch (error) {
      this.logger.warn(
        `Knowledge Pack unavailable at ${root}: ${errorMessage(error)}. Continuing without injection.`,
      );
      return null;
    }
  }

  private resolveRoot(): string {
    const configured =
      this.configService.get<string>('knowledge.root') ??
      DEFAULT_KNOWLEDGE_ROOT;
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
