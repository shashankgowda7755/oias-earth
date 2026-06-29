/**
 * Auth routes.
 *
 * POST /api/v1/auth/login  {username, password} -> {token, user}
 *
 * The original auth lived on a separate host (dev-auth.communitree.co.in) and
 * the success body's `user` object shape was not captured (spec openQuestions).
 * We return token + a user object containing exactly what the client persists
 * to localStorage (token, role, profileId, userDetails). The JWT is signed with
 * the SAME secret the REST middleware verifies, so the rebuild is self-contained.
 *
 * NOTE: REST endpoints expect the RAW token (no "Bearer "). The client stores
 * `token` and sends it raw on REST calls — see auth/middleware.ts.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db';
import { recordAudit, clientIp } from '../lib/audit';
import { badRequest, unauthorized } from '../errors';
import type {
  AuthUser,
  JwtPayload,
  LoginRequest,
  LoginResponse,
} from '../../../shared/types';

export const authRouter = Router();

interface LoginUserRow {
  profile_id: string;
  user_role_id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email_id: string | null;
  password_hash: string | null;
  role_id: number;
  role_name: string;
}

authRouter.post(
  '/login',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as Partial<LoginRequest>;
      const username = typeof body.username === 'string' ? body.username.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!username || !password) {
        throw badRequest('username and password are required');
      }

      // Join profile -> active role -> role name. A user may have multiple role
      // rows; we take the most recently created active one for the session.
      const result = await query<LoginUserRow>(
        `SELECT
           up.id            AS profile_id,
           ur.id            AS user_role_id,
           up.username      AS username,
           up.first_name    AS first_name,
           up.last_name     AS last_name,
           up.email_id      AS email_id,
           up.password_hash AS password_hash,
           mr.id            AS role_id,
           mr.name          AS role_name
         FROM user_profiles up
         JOIN user_roles ur ON ur.profile_id = up.id AND ur.is_active = TRUE
         JOIN master_roles mr ON mr.id = ur.role_id
         WHERE up.username = $1 AND up.is_active = TRUE
         ORDER BY ur.created_at DESC
         LIMIT 1`,
        [username]
      );

      const ip = clientIp(req);
      const row = result.rows[0];
      // Constant-ish failure: same error whether the user is missing or the
      // password is wrong, to avoid username enumeration.
      if (!row || !row.password_hash) {
        recordAudit({ action: 'auth.login_failed', actorName: username, entity: 'auth', method: 'POST', path: '/auth/login', status: 401, ip, meta: { reason: 'no_user' } });
        throw unauthorized('Invalid username or password');
      }

      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) {
        recordAudit({ action: 'auth.login_failed', actorName: username, entity: 'auth', method: 'POST', path: '/auth/login', status: 401, ip, meta: { reason: 'bad_password' } });
        throw unauthorized('Invalid username or password');
      }

      const payload: JwtPayload = {
        profileId: row.profile_id,
        userRoleId: row.user_role_id,
        username: row.username,
        role: row.role_name,
        roleId: row.role_id,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
      });

      const user: AuthUser = {
        profileId: row.profile_id,
        userRoleId: row.user_role_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email_id,
        role: row.role_name,
        roleId: row.role_id,
      };

      recordAudit({
        action: 'auth.login',
        actorId: row.profile_id,
        actorName: row.username,
        role: row.role_name,
        entity: 'auth',
        method: 'POST',
        path: '/auth/login',
        status: 200,
        ip,
      });

      const response: LoginResponse = { token, user };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/auth/demo-login  -> {token, user}
 *
 * TEMPORARY pre-launch convenience. Issues an admin session WITHOUT a password
 * so "click Dashboard → straight in" works while real login is unavailable.
 * Picks the most-recent active SuperAdmin (else Admin). Gated by
 * config.allowDemoLogin — DEFAULTS OFF (returns 404); opt in only for a
 * controlled demo with ALLOW_DEMO_LOGIN=true. PUBLIC BACKDOOR — remove this
 * route before real launch.
 */
authRouter.post(
  '/demo-login',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = clientIp(req);
      if (!config.allowDemoLogin) {
        res.status(404).json({ message: 'Not found' });
        return;
      }

      // Most-recent active admin; SuperAdmin preferred. No password check.
      const result = await query<Omit<LoginUserRow, 'password_hash'>>(
        `SELECT
           up.id         AS profile_id,
           ur.id         AS user_role_id,
           up.username   AS username,
           up.first_name AS first_name,
           up.last_name  AS last_name,
           up.email_id   AS email_id,
           mr.id         AS role_id,
           mr.name       AS role_name
         FROM user_profiles up
         JOIN user_roles ur ON ur.profile_id = up.id AND ur.is_active = TRUE
         JOIN master_roles mr ON mr.id = ur.role_id
         WHERE up.is_active = TRUE AND mr.name IN ('SuperAdmin', 'Admin')
         ORDER BY (mr.name = 'SuperAdmin') DESC, ur.created_at DESC
         LIMIT 1`
      );

      const row = result.rows[0];
      if (!row) {
        throw badRequest('No admin account available for demo login');
      }

      const payload: JwtPayload = {
        profileId: row.profile_id,
        userRoleId: row.user_role_id,
        username: row.username,
        role: row.role_name,
        roleId: row.role_id,
      };
      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
      });
      const user: AuthUser = {
        profileId: row.profile_id,
        userRoleId: row.user_role_id,
        username: row.username,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email_id,
        role: row.role_name,
        roleId: row.role_id,
      };

      recordAudit({
        action: 'auth.demo_login',
        actorId: row.profile_id,
        actorName: row.username,
        role: row.role_name,
        entity: 'auth',
        method: 'POST',
        path: '/auth/demo-login',
        status: 200,
        ip,
        meta: { backdoor: true },
      });

      const response: LoginResponse = { token, user };
      res.json(response);
    } catch (err) {
      next(err);
    }
  }
);
