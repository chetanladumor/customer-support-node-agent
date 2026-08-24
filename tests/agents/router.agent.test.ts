import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

// Set up deep mocks for all dependencies
jest.unstable_mockModule('ai', () => ({
  streamText: jest.fn().mockReturnValue({}),
  isStepCount: jest.fn().mockReturnValue(true)
}));

jest.unstable_mockModule('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn().mockReturnValue(jest.fn())
}));

jest.unstable_mockModule('@ai-sdk/google', () => ({
  google: jest.fn().mockReturnValue('mocked-google-model')
}));

jest.unstable_mockModule('../../src/agents/classifier.agent.js', () => ({
  ClassifierAgent: {
    classifyIntent: jest.fn<any>().mockResolvedValue({ agentType: 'ORDER', confidence: 99 })
  }
}));

jest.unstable_mockModule('../../src/agents/context.manager.js', () => ({
  ContextManager: {
    getConversationState: jest.fn<any>().mockResolvedValue({ currentOrderId: null }),
    buildSystemPrompt: jest.fn<any>().mockReturnValue('mocked prompt'),
    extractNewState: jest.fn<any>().mockReturnValue({ currentOrderId: '123' })
  }
}));

jest.unstable_mockModule('../../src/agents/sub.agents.js', () => ({
  getSubAgents: jest.fn().mockReturnValue({
    ORDER: { systemPrompt: 'order prompt', tools: {} },
    SUPPORT: { systemPrompt: 'support prompt', tools: {} }
  })
}));

jest.unstable_mockModule('../../src/services/chat.service.js', () => ({
  ChatService: {
    getConversationHistory: jest.fn<any>().mockResolvedValue([{ role: 'user', content: 'hi' }]),
    saveMessage: jest.fn<any>().mockResolvedValue({})
  }
}));

describe('Router Agent', () => {
  let RouterAgent: any;
  let aiMock: any;

  beforeAll(async () => {
    // Import module under test after mocks are initialized
    const module = await import('../../src/agents/router.agent.js');
    RouterAgent = module.RouterAgent;
    aiMock = await import('ai');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock global fetch for Ollama availability check to fail and fallback to Google
    global.fetch = jest.fn<any>().mockRejectedValue(new Error('Connection refused')) as any;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles incoming stream correctly and delegates to subagent', async () => {
    const result = await RouterAgent.handleIncomingMessageStream('conv_1', 'user_1', 'where is my order');

    // It should have called streamText
    expect(aiMock.streamText).toHaveBeenCalledWith(expect.objectContaining({
      model: 'mocked-google-model',
      system: 'mocked prompt',
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'user', content: 'where is my order' }
      ],
      tools: {}
    }));

    // Test the onFinish callback that saves the DB record
    const streamCall = aiMock.streamText.mock.calls[0][0];
    const ChatServiceMock = (await import('../../src/services/chat.service.js')).ChatService;
    
    await streamCall.onFinish({ 
      text: 'Order is on the way', 
      toolCalls: [{ toolCallId: '1', toolName: 'test', args: {} }], 
      toolResults: [] 
    });

    expect(ChatServiceMock.saveMessage).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: 'conv_1',
      role: 'assistant',
      content: 'Order is on the way',
      agentType: 'ORDER',
      toolCalls: expect.arrayContaining([
        expect.objectContaining({ id: '1', name: 'test' })
      ]),
      metadata: { currentOrderId: '123' }
    }));
  });

  it('uses Ollama when fetch succeeds', async () => {
    global.fetch = jest.fn<any>().mockResolvedValue({ ok: true });
    await RouterAgent.handleIncomingMessageStream('conv_1', 'user_1', 'hello');
    expect(global.fetch).toHaveBeenCalled();
  });

  it('onError logs errors correctly (Error instance)', async () => {
    await RouterAgent.handleIncomingMessageStream('conv_1', 'user_1', 'hello');
    const { onError } = aiMock.streamText.mock.calls[0][0];
    const mockError = new Error('Test error');
    mockError.stack = 'Mock stack trace';
    
    // suppress console.error for clean test output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    onError({ error: mockError });
    
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[RouterAgent] Error'), mockError);
    expect(consoleSpy).toHaveBeenCalledWith('Stack trace:', 'Mock stack trace');
    consoleSpy.mockRestore();
  });

  it('onError logs errors correctly (non-Error instance)', async () => {
    await RouterAgent.handleIncomingMessageStream('conv_1', 'user_1', 'hello');
    const { onError } = aiMock.streamText.mock.calls[0][0];
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    onError({ error: { some: 'error' } });
    
    expect(consoleSpy).toHaveBeenCalledWith('Unknown error object:', '{"some":"error"}');
    consoleSpy.mockRestore();
  });
});
