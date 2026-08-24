import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule('ai', () => ({
  generateText: jest.fn<any>().mockResolvedValue({ text: 'mocked rewritten query' }),
  embed: jest.fn<any>().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] })
}));

jest.unstable_mockModule('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn().mockReturnValue(jest.fn())
}));

jest.unstable_mockModule('../../src/services/embedding.factory.js', () => ({
  EmbeddingFactory: {
    getEmbeddingModel: jest.fn().mockReturnValue({}),
    getEmbeddingDimensions: jest.fn().mockReturnValue(768),
    generateEmbedding: jest.fn<any>().mockResolvedValue([0.1, 0.2, 0.3])
  }
}));

jest.unstable_mockModule('../../src/services/reranker.service.js', () => {
  return {
    RerankerService: {
      rerank: jest.fn().mockImplementation((query, candidates: any) => {
        return candidates.map((c: any) => ({ ...c, rerankerScore: 99 }));
      })
    }
  };
});

describe('RagService', () => {
  let RagService: any;

  beforeAll(async () => {
    const module = await import('../../src/services/rag.service.js');
    RagService = module.RagService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchKnowledgeBase', () => {
    it('executes a hybrid CTE query and maps results', async () => {
      const mockSqlResult = [
        {
          chunkId: 'chunk_1',
          knowledgeBaseId: 'kb_1',
          title: 'Shipping Policy',
          content: 'Free shipping over $50',
          vector_rank: 1n, 
          keyword_rank: 2n,
          rrf_score: 0.033
        }
      ];

      (prismaMock as any).$queryRawUnsafe.mockResolvedValue(mockSqlResult);

      const results = await RagService.searchKnowledgeBase('shipping policy', 'tenantA', 'US', 'english');

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Shipping Policy');
      expect(results[0].rrfScore).toBe(0.033);
      expect(results[0].vectorRank).toBe(1); 
      expect((results[0] as any).rerankerScore).toBe(99);
      expect(prismaMock.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('returns empty array if no results', async () => {
      (prismaMock as any).$queryRawUnsafe.mockResolvedValue([]);

      const results = await RagService.searchKnowledgeBase('unknown', 'tenantA', 'US', 'english');

      expect(results.length).toBe(0);
    });

    it('handles custom history, language, and null ranks for branch coverage', async () => {
      const mockSqlResult = [
        {
          chunkId: 'chunk_2',
          knowledgeBaseId: 'kb_2',
          title: 'Return Policy',
          content: '30 days',
          vector_rank: null, 
          keyword_rank: null,
          rrf_score: 0.0
        }
      ];

      (prismaMock as any).$queryRawUnsafe.mockResolvedValue(mockSqlResult);

      const results = await RagService.searchKnowledgeBase('return policy', 'tenantB', undefined, 'spanish', 'history context');

      expect(results.length).toBe(1);
      expect(results[0].vectorRank).toBeNull();
      expect(results[0].keywordRank).toBeNull();
    });
  });
});
