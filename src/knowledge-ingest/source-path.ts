import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * Resolve a source path and require it to stay under knowledge/sources/
 * after realpath (rejects symlink escapes and arbitrary absolute paths).
 */
export async function resolveKnowledgeSourcePath(params: {
  knowledgeRoot: string;
  sourcePath: string;
}): Promise<{ absolutePath: string; relativeToKnowledge: string }> {
  const sourcesRoot = path.resolve(params.knowledgeRoot, 'sources');
  let sourcesReal: string;
  try {
    sourcesReal = await fs.realpath(sourcesRoot);
  } catch {
    throw new Error(
      `Knowledge sources directory not found: ${path.relative(process.cwd(), sourcesRoot) || sourcesRoot}`,
    );
  }

  const candidate = path.resolve(params.sourcePath);
  let absolutePath: string;
  try {
    absolutePath = await fs.realpath(candidate);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error(`Source not found: ${params.sourcePath}`);
    }
    throw error;
  }

  const relative = path.relative(sourcesReal, absolutePath);
  if (
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    relative.length === 0
  ) {
    throw new Error(
      `Source must resolve under knowledge/sources/ (got ${absolutePath}). Symlinks that escape the tree are rejected.`,
    );
  }

  return {
    absolutePath,
    relativeToKnowledge: path
      .join('sources', relative)
      .split(path.sep)
      .join('/'),
  };
}
