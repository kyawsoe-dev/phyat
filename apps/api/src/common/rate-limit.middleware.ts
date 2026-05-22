import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const limits = new Map<string, { count: number; resetTime: number }>();
const windowMs = 60000;
const maxRequests = 100;
const authMaxRequests = 10;

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/google', '/admin/login'];

function getKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `${ip}:${req.method}:${req.path}`;
}

function setHeaders(res: Response, remaining: number, reset: number, limit: number) {
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + reset).toISOString());
}

export function RateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const isAuthPath = AUTH_PATHS.some((p) => req.path === p || req.path.startsWith(p + '/'));
  const limit = isAuthPath ? authMaxRequests : maxRequests;

  const key = getKey(req);
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || now > entry.resetTime) {
    limits.set(key, { count: 1, resetTime: now + windowMs });
    setHeaders(res, limit - 1, windowMs, limit);
    return next();
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    throw new HttpException(`Rate limit exceeded. Retry after ${retryAfter} seconds.`, HttpStatus.TOO_MANY_REQUESTS);
  }

  entry.count++;
  setHeaders(res, limit - entry.count, entry.resetTime - now, limit);
  next();
}