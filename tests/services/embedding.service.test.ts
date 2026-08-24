import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock
}));

jest.unstable_mockModule('ai', () => ({
  embed: jest.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] })
}));

jest.unstable_mockModule('@ai-sdk/google', () => ({
  google: {
    textEmbeddingModel: jest.fn().mockReturnValue('mock-model')
  }
}));

describe('Embedding Service', () => {
  let EmbeddingService: any;
  let aiModule: any;
  
  beforeAll(async () => {
    const module = await import('../../src/services/embedding.service.js');
    EmbeddingService = module.EmbeddingService;
    aiModule = await import('ai');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generates an embedding', async () => {
    const result = await EmbeddingService.generateEmbedding('test query');
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(aiModule.embed).toHaveBeenCalledWith(expect.objectContaining({ value: 'test query' }));
  });

  it('searches knowledge base using raw query', async () => {
    (prismaMock as any).$queryRaw.mockResolvedValueOnce([{ id: 'kb1' }]);
    
    const result = await EmbeddingService.searchKnowledgeBase('test query');
    
    expect(result).toEqual([{ id: 'kb1' }]);
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
  });

  it('updates article embedding', async () => {
    (prismaMock as any).$executeRaw.mockResolvedValueOnce(1);
    
    const result = await EmbeddingService.updateArticleEmbedding('kb1', 'new content');
    
    expect(result).toBe(true);
    expect(prismaMock.$executeRaw).toHaveBeenCalled();
  });
});
