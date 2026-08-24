import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response } from 'express';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('Health Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock<any>;
  let HealthController: any;

  beforeAll(async () => {
    const module = await import('../../src/controllers/health.controller.js');
    HealthController = module.HealthController;
  });

  beforeEach(() => {
    mockReq = {};
    jsonMock = jest.fn();
    mockRes = {
      json: jsonMock,
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns connected when DB is up', async () => {
    (prismaMock as any).$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

    await HealthController.check(mockReq as Request, mockRes as Response);

    expect((prismaMock as any).$queryRaw).toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        status: 'ok',
        database: 'connected'
      })
    });
  });

  it('returns degraded when DB is down', async () => {
    (prismaMock as any).$queryRaw.mockRejectedValueOnce(new Error('DB DOWN'));

    await HealthController.check(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      data: expect.objectContaining({
        status: 'degraded',
        database: 'disconnected'
      })
    });
  });
});
