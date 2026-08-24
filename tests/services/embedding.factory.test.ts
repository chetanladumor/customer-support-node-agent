import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

jest.unstable_mockModule('ai', () => ({
  embed: jest.fn(),
  embedMany: jest.fn(),
}));

const mockOpenAiModel = 'openai-model';
const mockOpenAiClient = { textEmbeddingModel: jest.fn().mockReturnValue(mockOpenAiModel) };

jest.unstable_mockModule('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn().mockReturnValue(mockOpenAiClient)
}));

const mockGoogleModel = 'google-model';
jest.unstable_mockModule('@ai-sdk/google', () => ({
  google: { textEmbeddingModel: jest.fn().mockReturnValue(mockGoogleModel) }
}));

describe('Embedding Factory', () => {
  let EmbeddingFactory: any;
  let aiMock: any;
  const originalEnv = process.env;

  beforeAll(async () => {
    const module = await import('../../src/services/embedding.factory.js');
    EmbeddingFactory = module.EmbeddingFactory;
    aiMock = await import('ai');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses ollama by default', () => {
    delete process.env.EMBEDDING_PROVIDER;
    const model = EmbeddingFactory.getModel();
    expect(model).toBe(mockOpenAiModel);
    expect(mockOpenAiClient.textEmbeddingModel).toHaveBeenCalledWith('nomic-embed-text');
  });

  it('uses openai if configured', () => {
    process.env.EMBEDDING_PROVIDER = 'openai';
    process.env.EMBEDDING_MODEL = 'text-embedding-3-small';
    const model = EmbeddingFactory.getModel();
    expect(model).toBe(mockOpenAiModel);
    expect(mockOpenAiClient.textEmbeddingModel).toHaveBeenCalledWith('text-embedding-3-small');
  });

  it('uses google if configured', async () => {
    process.env.EMBEDDING_PROVIDER = 'google';
    const model = EmbeddingFactory.getModel();
    expect(model).toBe(mockGoogleModel);
  });

  it('generates a single embedding', async () => {
    aiMock.embed.mockResolvedValueOnce({ embedding: [0.1, 0.2] });
    const result = await EmbeddingFactory.generateEmbedding('test');
    expect(result).toEqual([0.1, 0.2]);
    expect(aiMock.embed).toHaveBeenCalledWith(expect.objectContaining({ value: 'test' }));
  });

  it('generates multiple embeddings', async () => {
    aiMock.embedMany.mockResolvedValueOnce({ embeddings: [[0.1], [0.2]] });
    const result = await EmbeddingFactory.generateEmbeddings(['test1', 'test2']);
    expect(result).toEqual([[0.1], [0.2]]);
    expect(aiMock.embedMany).toHaveBeenCalledWith(expect.objectContaining({ values: ['test1', 'test2'] }));
  });
});
