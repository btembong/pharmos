import { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '../lib/redis';

const publicLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix: 'rl:public',
});

const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 m'),
  prefix: 'rl:auth',
});

export function rateLimit(type: 'public' | 'auth' = 'public') {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    const limiter = type === 'auth' ? authLimiter : publicLimiter;
    const identifier = req.ip || 'unknown';

    try {
      const result = await limiter.limit(identifier);
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);

      if (!result.success) {
        res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMITED',
        });
        return;
      }
      next();
    } catch {
      // If Redis is down, allow the request through
      next();
    }
  };
}
