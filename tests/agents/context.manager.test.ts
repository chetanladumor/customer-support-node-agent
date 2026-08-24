import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { ConversationState } from '../../src/shared/types.js';

jest.unstable_mockModule('../../src/services/chat.service.js', () => ({
  ChatService: {
    getConversationHistory: jest.fn()
  }
}));

describe('Context Manager', () => {
  let ContextManager: any;
  let ChatServiceMock: any;

  beforeAll(async () => {
    const module = await import('../../src/agents/context.manager.js');
    ContextManager = module.ContextManager;
    const chatServiceModule = await import('../../src/services/chat.service.js');
    ChatServiceMock = chatServiceModule.ChatService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets conversation state from last assistant message with metadata', async () => {
    const mockHistory = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello', metadata: { lastMentionedOrderId: 'ORDER-1234' } },
      { role: 'user', content: 'where is it' }
    ];
    ChatServiceMock.getConversationHistory.mockResolvedValueOnce(mockHistory);

    const state = await ContextManager.getConversationState('conv_1');
    expect(state).toEqual({ lastMentionedOrderId: 'ORDER-1234' });
  });

  it('returns default state if no metadata exists in history', async () => {
    ChatServiceMock.getConversationHistory.mockResolvedValueOnce([]);
    const state = await ContextManager.getConversationState('conv_1');
    expect(state).toEqual({
      lastMentionedOrderId: null,
      lastMentionedInvoiceId: null,
      lastAgent: null,
      recentTopic: null
    });
  });

  describe('buildSystemPrompt', () => {
    it('appends context if state has lastMentionedOrderId', () => {
      const prompt = ContextManager.buildSystemPrompt('Base prompt.', {
        lastMentionedOrderId: 'ORDER-1234',
        lastMentionedInvoiceId: null,
        lastAgent: 'ORDER',
        recentTopic: null
      });

      expect(prompt).toContain('Base prompt.');
      expect(prompt).toContain('- Active Order ID: ORDER-1234');
      expect(prompt).toContain('If the user asks a follow-up question');
    });

    it('appends context if state has lastMentionedInvoiceId', () => {
      const prompt = ContextManager.buildSystemPrompt('Base prompt.', {
        lastMentionedOrderId: null,
        lastMentionedInvoiceId: 'INV-2024-001',
        lastAgent: 'BILLING',
        recentTopic: null
      });

      expect(prompt).toContain('- Active Invoice ID: INV-2024-001');
    });
  });

  it('returns base prompt if state is empty', () => {
    const basePrompt = 'You are a helpful assistant.';
    const state = {} as ConversationState;
    const prompt = ContextManager.buildSystemPrompt(basePrompt, state);
    expect(prompt).toEqual(basePrompt);
  });

  it('extracts new state using regex from text', () => {
    const previousState = { lastMentionedOrderId: null, lastMentionedInvoiceId: null, lastAgent: null, recentTopic: null } as any;
    
    // Order Extraction
    let newState = ContextManager.extractNewState('my order is order-1234', '', previousState, 'ORDER');
    expect(newState.lastMentionedOrderId).toBe('ORDER-1234');
    expect(newState.lastAgent).toBe('ORDER');

    // Invoice Extraction
    newState = ContextManager.extractNewState('invoice inv-1234-567', '', previousState, 'BILLING');
    expect(newState.lastMentionedInvoiceId).toBe('INV-1234-567');
  });
});
