import { Router, type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { requireProjectAccess } from '../utils/staffAccess';
import {
  parseGeneratedLayoutFileName,
  verifyGeneratedLayoutSig,
} from '../utils/signedGeneratedLayoutUrl';
import { getGeneratedLayoutsDir } from '../services/roofLayoutImageStorage';

const router = Router();

function contentTypeForExt(ext: string): string {
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'image/png';
}

function streamLayoutFile(
  res: Response,
  projectId: string,
  kind: string,
  ext: string,
): void {
  const absDir = path.resolve(getGeneratedLayoutsDir());
  const absFile = path.resolve(absDir, `${projectId}_${kind}.${ext}`);
  if (!absFile.startsWith(absDir + path.sep)) {
    res.status(400).json({ error: 'Invalid path' });
    return;
  }
  if (!fs.existsSync(absFile)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.setHeader('Content-Type', contentTypeForExt(ext));
  res.setHeader('Cache-Control', 'private, max-age=300');
  fs.createReadStream(absFile).pipe(res);
}

/**
 * Serve a single generated layout file.
 * Allowed when:
 * - Valid short-lived HMAC (exp+sig) — for <img src> without staff JWT in query, or
 * - Authenticated staff with project access.
 */
router.get('/:fileName', (req: Request, res: Response, next: NextFunction) => {
  const fileName = String(req.params.fileName || '').trim();
  const parsed = parseGeneratedLayoutFileName(fileName);
  if (!parsed) {
    return res.status(404).json({ error: 'Not found' });
  }

  const exp = typeof req.query.exp === 'string' ? req.query.exp : '';
  const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
  if (exp && sig && verifyGeneratedLayoutSig(fileName, exp, sig)) {
    streamLayoutFile(res, parsed.projectId, parsed.kind, parsed.ext);
    return;
  }

  authenticate(req, res, async () => {
    try {
      if (!(await requireProjectAccess(req, res, parsed.projectId))) return;
      streamLayoutFile(res, parsed.projectId, parsed.kind, parsed.ext);
    } catch (e) {
      next(e);
    }
  });
});

export default router;
