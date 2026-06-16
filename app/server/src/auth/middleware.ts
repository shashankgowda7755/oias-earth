/**
 * Auth middleware — reproduces the observed legacy REST auth contract.
 *
 * CONTRACT (from spec authObserved + project brief):
 *   - REST endpoints expect the RAW JWT in the Authorization header, with NO
 *     "Bearer " prefix. We therefore do NOT split on a space; we verify the
 *     header value as-is.
 *   - Missing header  -> 403 {error:true, message:'Missing Authorisation Token!'}
 *   - Bad/invalid JWT -> 500 {error:true, message:'jwt malformed'} (and other
 *     jsonwebtoken error messages) to match the quirky observed behaviour where
 *     a malformed token yields a 500 rather than a 401.
 *
 * IMPROVEMENT NOTE: returning 500 for a malformed token is a legacy quirk — a
 * 401 would be the correct semantic. We reproduce the legacy behaviour
 * faithfully but a v2 should map jwt errors to 401. (See NOTES.md.)
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { JwtPayload } from '../../../shared/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Decoded JWT payload, set by requireAuth. */
      auth?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization') ?? req.header('Authorization');

  if (!header || header.trim() === '') {
    res.status(403).json({ error: true, message: 'Missing Authorisation Token!' });
    return;
  }

  // RAW token — do NOT strip a "Bearer " prefix. If a client sends
  // "Bearer <token>", jwt.verify will treat the whole string as the token and
  // throw "jwt malformed", reproducing the documented legacy behaviour.
  const rawToken = header.trim();

  try {
    const decoded = jwt.verify(rawToken, config.jwtSecret) as JwtPayload;
    req.auth = decoded;
    next();
  } catch (err) {
    // jsonwebtoken throws JsonWebTokenError with messages like "jwt malformed",
    // "invalid signature", "jwt expired". Surface the message verbatim with a
    // 500 to match the observed contract.
    const message = err instanceof Error ? err.message : 'jwt malformed';
    res.status(500).json({ error: true, message });
  }
}
