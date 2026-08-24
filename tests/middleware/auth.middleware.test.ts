import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));
import { ApiError } from '../../src/middleware/errorHandler.js';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFunction: NextFunction;
  let authMiddleware: any;

  beforeAll(async () => {
    const module = await import('../../src/middleware/auth.middleware.js');
    authMiddleware = module.authMiddleware;
  });

  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    mockRes = {};
    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('uses x-user-id header and attaches user to request', async () => {
    mockReq.headers = { 'x-user-id': 'user_123' };
    const mockUser = { id: 'user_123', name: 'Test' } as any;
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    await authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user_123' } });
    expect(mockReq.user).toEqual(mockUser);
    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('uses Authorization Bearer token', async () => {
    mockReq.headers = { 'authorization': 'Bearer user_456' };
    const mockUser = { id: 'user_456', name: 'Test 2' } as any;
    prismaMock.user.findUnique.mockResolvedValue(mockUser);

    await authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user_456' } });
    expect(mockReq.user).toEqual(mockUser);
  });

  it('falls back to search by email if id not found', async () => {
    mockReq.headers = { 'x-user-id': 'test@test.com' };
    prismaMock.user.findUnique.mockResolvedValue(null);
    
    const mockUser = { id: 'user_789', email: 'test@test.com' } as any;
    prismaMock.user.findFirst.mockResolvedValueOnce(mockUser);

    await authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
    expect(mockReq.user).toEqual(mockUser);
  });

  it('throws ApiError if no users exist in database as fallback', async () => {
    mockReq.headers = { 'x-user-id': 'unknown' };
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null); // Fallback by email returns null
    // Fallback global returns null

    await authMiddleware(mockReq as Request, mockRes as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith(expect.any(ApiError));
    const passedError = (nextFunction as any).mock.calls[0][0];
    expect(passedError.statusCode).toBe(401);
  });
});
