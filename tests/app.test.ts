import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule('../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('App & Global Routes', () => {
  let app: any;

  beforeAll(async () => {
    const module = await import('../src/app.js');
    app = module.app;
  });
  it('GET /api/health should return ok', async () => {
    // Mock the raw query that the health route does
    (prismaMock as any).$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
  });

  it('GET /api/health should handle db down gracefully', async () => {
    (prismaMock as any).$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));
    
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.database).toBe('disconnected');
  });

  it('GET /non-existent-route should return 404 handled by express (or 401 if under /api due to auth)', async () => {
    const res = await request(app).get('/api/non-existent-route');
    // Because authMiddleware is globally mounted to /api and runs before 404, it hits 401 first
    expect(res.status).toBe(401);
  });
});
