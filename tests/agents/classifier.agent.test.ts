import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// Mock the AI SDK
jest.unstable_mockModule('ai', () => {
  return {
    generateObject: jest.fn()
  };
});
jest.unstable_mockModule('@ai-sdk/google', () => {
  return { google: jest.fn() };
});
jest.unstable_mockModule('@ai-sdk/openai', () => {
  return { createOpenAI: jest.fn().mockReturnValue(jest.fn()) };
});

describe('ClassifierAgent', () => {
  let generateObjectMock: any;
  let ClassifierAgent: any;

  beforeAll(async () => {
    // Import after mocks are set
    const module = await import('../../src/agents/classifier.agent.js');
    ClassifierAgent = module.ClassifierAgent;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const aiModule = await import('ai');
    generateObjectMock = aiModule.generateObject;
  });

  it('routes "Where is my package?" to ORDER', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        scores: { ORDER: 98, BILLING: 10, SUPPORT: 5, GREETING: 0 },
        rationale: 'User is asking for order tracking.'
      }
    });

    const result = await ClassifierAgent.classifyIntent('Where is my package?', '');
    expect(result.agentType).toBe('ORDER');
    expect(result.confidence).toBe(98);
  });

  it('routes return policies to SUPPORT', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        scores: { ORDER: 10, BILLING: 0, SUPPORT: 100, GREETING: 0 },
        rationale: 'User is asking about return policies.'
      }
    });

    const result = await ClassifierAgent.classifyIntent('What is the return policy?', '');
    expect(result.agentType).toBe('SUPPORT');
    expect(result.confidence).toBe(100);
  });

  it('falls back to FALLBACK if confidence is below 40', async () => {
    generateObjectMock.mockResolvedValueOnce({
      object: {
        scores: { ORDER: 30, BILLING: 20, SUPPORT: 15, GREETING: 10 },
        rationale: 'Ambiguous query.'
      }
    });

    const result = await ClassifierAgent.classifyIntent('Who are you?', '');
    expect(result.agentType).toBe('FALLBACK');
  });

  it('uses Ollama if fetch succeeds', async () => {
    global.fetch = jest.fn<any>().mockResolvedValue({ ok: true });
    generateObjectMock.mockResolvedValueOnce({
      object: {
        scores: { ORDER: 99, BILLING: 0, SUPPORT: 0, GREETING: 0 },
        rationale: 'Ollama rationale'
      }
    });

    const result = await ClassifierAgent.classifyIntent('Where is my package?', '');
    expect(result.agentType).toBe('ORDER');
    expect(global.fetch).toHaveBeenCalled();
  });
});
