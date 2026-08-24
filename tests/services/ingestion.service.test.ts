import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule('../../src/services/embedding.factory.js', () => ({
  EmbeddingFactory: {
    generateEmbeddings: jest.fn<any>().mockResolvedValue([[0.1, 0.2]])
  }
}));

describe('Ingestion Service', () => {
  let IngestionService: any;
  let EmbeddingFactoryMock: any;

  beforeAll(async () => {
    const module = await import('../../src/services/ingestion.service.js');
    IngestionService = module.IngestionService;
    const factoryModule = await import('../../src/services/embedding.factory.js');
    EmbeddingFactoryMock = factoryModule.EmbeddingFactory;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('throws if article not found', async () => {
    prismaMock.knowledgeBase.findUnique.mockResolvedValueOnce(null);
    await expect(IngestionService.ingestArticle('1')).rejects.toThrow('Article not found');
  });

  it('ingests article and chunks correctly', async () => {
    // Generate a string of length 1500 to test chunking
    const longText = 'a'.repeat(1500); 
    const mockArticle = { id: '1', content: longText, language: 'en' };
    
    prismaMock.knowledgeBase.findUnique.mockResolvedValueOnce(mockArticle as any);
    
    // Chunk size is 1000, overlap is 200.
    // Chunk 1: 0 - 1000
    // i increments by 800
    // Chunk 2: 800 - 1800 (which is 1500)
    // So 2 chunks total.
    EmbeddingFactoryMock.generateEmbeddings.mockResolvedValueOnce([
      [0.1, 0.2],
      [0.3, 0.4]
    ]);

    await IngestionService.ingestArticle('1');

    expect(prismaMock.knowledgeBaseChunk.deleteMany).toHaveBeenCalledWith({ where: { knowledgeBaseId: '1' } });
    expect(EmbeddingFactoryMock.generateEmbeddings).toHaveBeenCalledWith(expect.arrayContaining([expect.any(String), expect.any(String)]));
    
    // Ensure raw sql was executed twice (once for each chunk)
    expect((prismaMock as any).$executeRawUnsafe).toHaveBeenCalledTimes(2);
  });
});
