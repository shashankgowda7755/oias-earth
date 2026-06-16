/**
 * Error envelope helpers. The API returns {error:true, message} on failure
 * (per the project brief). Some statuses/messages are reproduced verbatim to
 * match observed legacy behaviour (see auth/middleware.ts).
 */

export class HttpError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}
export function unauthorized(message: string): HttpError {
  return new HttpError(401, message);
}
export function forbidden(message: string): HttpError {
  return new HttpError(403, message);
}
export function notFound(message: string): HttpError {
  return new HttpError(404, message);
}
export function serverError(message: string): HttpError {
  return new HttpError(500, message);
}
