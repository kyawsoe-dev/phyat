import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const limits = new Map<string, { count: number; resetTime: number }>();
const windowMs = 60000;
const maxRequests = 100;

function getKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]) : req.ip;
  return `${ip}:${req.method}:${req.path}`;
}

function setHeaders(res: Response, remaining: number, reset: number) {
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + reset).toISOString());
}

export function RateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = getKey(req);
  const now = Date.now();
  const entry = limits.get(key);

  if (!entry || now > entry.resetTime) {
    limits.set(key, { count: 1, resetTime: now + windowMs });
    setHeaders(res, maxRequests - 1, windowMs);
    return next();
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    throw new HttpException(`Rate limit exceeded. Retry after ${retryAfter} seconds.`, HttpStatus.TOO_MANY_REQUESTS);
  }

  entry.count++;
  setHeaders(res, maxRequests - entry.count, entry.resetTime - now);
  next();
}