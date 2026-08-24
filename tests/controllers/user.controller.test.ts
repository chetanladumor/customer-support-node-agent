import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response } from 'express';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('User Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock<any>;
  let UserController: any;

  beforeAll(async () => {
    const module = await import('../../src/controllers/user.controller.js');
    UserController = module.UserController;
  });

  beforeEach(() => {
    mockReq = {};
    jsonMock = jest.fn();
    mockRes = {
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  it('lists all users with counts', async () => {
    const mockUsers = [
      { id: '1', name: 'User 1', _count: { orders: 2 } },
      { id: '2', name: 'User 2', _count: { orders: 0 } },
    ];
    prismaMock.user.findMany.mockResolvedValue(mockUsers as any);

    await UserController.listUsers(mockReq as Request, mockRes as Response);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      include: {
        _count: { select: { orders: true, invoices: true, conversations: true } }
      }
    });
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockUsers });
  });
});
