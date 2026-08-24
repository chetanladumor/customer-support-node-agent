import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

jest.unstable_mockModule('ai', () => ({
  generateText: jest.fn()
}));

jest.unstable_mockModule('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn().mockReturnValue(jest.fn())
}));

describe('Reranker Service', () => {
  let RerankerService: any;
  let generateTextMock: any;

  beforeAll(async () => {
    const aiMock = await import('ai');
    generateTextMock = aiMock.generateText;
    const module = await import('../../src/services/reranker.service.js');
    RerankerService = module.RerankerService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('returns empty array if no candidates', async () => {
    const result = await RerankerService.rerank('query', []);
    expect(result).toEqual([]);
  });

  it('reranks and sorts candidates correctly', async () => {
    // We mock generateText to return "95" for the first candidate and "50" for the second
    generateTextMock
      .mockResolvedValueOnce({ text: '95' })
      .mockResolvedValueOnce({ text: '50' });

    const candidates = [
      { chunkId: '1', content: 'good content', score: 0 },
      { chunkId: '2', content: 'bad content', score: 0 }
    ];

    const result = await RerankerService.rerank('query', candidates as any, 2);

    expect(result).toHaveLength(2);
    expect(result[0].chunkId).toBe('1'); // 95 score
    expect(result[0].score).toBe(95);
    expect(result[1].chunkId).toBe('2'); // 50 score
    expect(result[1].score).toBe(50);
  });

  it('handles invalid scores (NaN) as 0', async () => {
    generateTextMock.mockResolvedValueOnce({ text: 'not a number' });

    const candidates = [{ chunkId: '1', content: 'good content', score: 0 }];
    const result = await RerankerService.rerank('query', candidates as any, 2);

    expect(result[0].score).toBe(0);
  });

  it('handles network errors as 0 score', async () => {
    generateTextMock.mockRejectedValueOnce(new Error('Network error'));

    const candidates = [{ chunkId: '1', content: 'good content', score: 0 }];
    const result = await RerankerService.rerank('query', candidates as any, 2);

    expect(result[0].score).toBe(0);
  });
});
