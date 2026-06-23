import fs from 'fs';
import path from 'path';

const SAFE_ARTICLE_ID = /^[a-z0-9-]+$/;

function resolveArticlesDir(): string | null {
  const candidates = [
    path.join(__dirname, '../content/consumer-help'),
    path.join(process.cwd(), 'src/content/consumer-help'),
    path.join(process.cwd(), 'dist/content/consumer-help'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      return dir;
    }
  }

  return null;
}

export function loadConsumerHelpArticleMarkdown(articleId: string): string | null {
  if (!SAFE_ARTICLE_ID.test(articleId)) return null;

  const dir = resolveArticlesDir();
  if (!dir) return null;

  const filePath = path.join(dir, `${articleId}.md`);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8');
}
