import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('Chat Service', () => {
  let ChatService: any;

  beforeAll(async () => {
    const module = await import('../../src/services/chat.service.js');
    ChatService = module.ChatService;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets existing conversation if it belongs to user', async () => {
    const mockConv = { id: 'conv_1', userId: 'user_1' };
    prismaMock.conversation.findUnique.mockResolvedValueOnce(mockConv as any);

    const result = await ChatService.getOrCreateConversation('conv_1', 'user_1');
    expect(result).toEqual(mockConv);
    expect(prismaMock.conversation.findUnique).toHaveBeenCalledWith({ where: { id: 'conv_1' } });
  });

  it('creates new conversation if existing does not belong to user', async () => {
    const mockConv = { id: 'conv_1', userId: 'user_2' };
    prismaMock.conversation.findUnique.mockResolvedValueOnce(mockConv as any);
    
    const newConv = { id: 'conv_new', userId: 'user_1' };
    prismaMock.conversation.create.mockResolvedValueOnce(newConv as any);

    const result = await ChatService.getOrCreateConversation('conv_1', 'user_1');
    expect(result).toEqual(newConv);
    expect(prismaMock.conversation.create).toHaveBeenCalled();
  });

  it('creates new conversation if no conversationId provided', async () => {
    const newConv = { id: 'conv_new', userId: 'user_1' };
    prismaMock.conversation.create.mockResolvedValueOnce(newConv as any);

    const result = await ChatService.getOrCreateConversation(undefined, 'user_1');
    expect(result).toEqual(newConv);
    expect(prismaMock.conversation.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.conversation.create).toHaveBeenCalled();
  });

  it('saves message correctly with defaults', async () => {
    const mockMsg = { id: 'msg_1' };
    prismaMock.message.create.mockResolvedValueOnce(mockMsg as any);

    await ChatService.saveMessage({
      conversationId: 'conv_1',
      role: 'user',
      content: 'hello'
    });

    expect(prismaMock.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        conversationId: 'conv_1',
        role: 'user',
        content: 'hello',
        agentType: undefined,
        reasoningSteps: null,
        toolCalls: null,
        metadata: null,
      }
    }) as any);
  });

  it('fetches and reverses conversation history', async () => {
    const mockMessages = [{ id: '2' }, { id: '1' }]; // descending order from DB
    prismaMock.message.findMany.mockResolvedValueOnce(mockMessages as any);

    const result = await ChatService.getConversationHistory('conv_1', 10);
    
    // Result should be ascending
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    expect(prismaMock.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv_1' },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  });
});
