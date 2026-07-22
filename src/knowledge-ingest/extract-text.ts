import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ExtractedSource = {
  text: string;
  sourcePath: string;
  format: 'txt' | 'md' | 'pdf';
  extractor: 'read-file' | 'pdftotext';
};

function extensionOf(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

async function extractPdfWithPdftotext(filePath: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'pdftotext',
      ['-layout', '-enc', 'UTF-8', filePath, '-'],
      { maxBuffer: 20 * 1024 * 1024 },
    );
    return stdout;
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stderr?: string };
    if (err.code === 'ENOENT') {
      throw new Error(
        'pdftotext not found. Install poppler (e.g. `brew install poppler`) to extract PDF text.',
      );
    }
    throw new Error(
      `pdftotext failed for ${filePath}: ${err.stderr?.trim() || err.message}`,
    );
  }
}

export async function extractTextFromSource(
  sourcePath: string,
): Promise<ExtractedSource> {
  const absolute = path.resolve(sourcePath);
  const ext = extensionOf(absolute);

  if (ext === '.txt' || ext === '.md') {
    const text = await fs.readFile(absolute, 'utf8');
    return {
      text,
      sourcePath: absolute,
      format: ext === '.md' ? 'md' : 'txt',
      extractor: 'read-file',
    };
  }

  if (ext === '.pdf') {
    const text = await extractPdfWithPdftotext(absolute);
    if (!text.trim()) {
      throw new Error(
        `pdftotext returned empty text for ${absolute}. OCR is out of scope for this pipeline; provide a text layer or a .txt extract.`,
      );
    }
    return {
      text,
      sourcePath: absolute,
      format: 'pdf',
      extractor: 'pdftotext',
    };
  }

  throw new Error(
    `Unsupported source extension "${ext}". Use .txt, .md, or .pdf.`,
  );
}
