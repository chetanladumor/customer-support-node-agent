import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../../src/middleware/rateLimiter.js';
import { ApiError } from '../../src/middleware/errorHandler.js';

describe('Rate Limiter Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;
  let setHeaderMock: jest.Mock<any>;

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1'
    };
    setHeaderMock = jest.fn();
    mockRes = {
      set: setHeaderMock
    };
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('allows requests within the limit', () => {
    // Generate a unique IP to avoid global state cross-contamination between tests
    (mockReq as any).ip = '192.168.1.1';
    const rateLimiter = createRateLimiter({ maxRequests: 2, windowMs: 10000 });

    rateLimiter(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledWith();
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '2');
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '1');

    jest.clearAllMocks();
    
    rateLimiter(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledWith();
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
  });

  it('blocks requests exceeding the limit', () => {
    (mockReq as any).ip = '192.168.1.2';
    const rateLimiter = createRateLimiter({ maxRequests: 1, windowMs: 10000 });

    // First request should pass
    rateLimiter(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledWith();

    jest.clearAllMocks();

    // Second request should fail
    rateLimiter(mockReq as Request, mockRes as Response, nextFunction);
    
    expect(setHeaderMock).toHaveBeenCalledWith('Retry-After', expect.any(String));
    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    const passedError = (nextFunction as any).mock.calls[0][0];
    expect(passedError.statusCode).toBe(429);
  });

  it('resets the limit after the window expires', () => {
    (mockReq as any).ip = '192.168.1.3';
    jest.useFakeTimers();
    
    const rateLimiter = createRateLimiter({ maxRequests: 1, windowMs: 1000 });

    rateLimiter(mockReq as Request, mockRes as Response, nextFunction);
    
    // Fast-forward time
    jest.advanceTimersByTime(1100);

    jest.clearAllMocks();
    
    // Should pass again
    rateLimiter(mockReq as Request, mockRes as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledWith();
    expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');

    jest.useRealTimers();
  });
});
