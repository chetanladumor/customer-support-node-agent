import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { Request, Response } from 'express';
import { mockDeep } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();
jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));
import { ApiError } from '../../src/middleware/errorHandler.js';

jest.unstable_mockModule('../../src/services/chat.service.js', () => ({
  ChatService: {
    getOrCreateConversation: jest.fn(),
    saveMessage: jest.fn()
  }
}));

jest.unstable_mockModule('../../src/agents/router.agent.js', () => ({
  RouterAgent: {
    handleIncomingMessageStream: jest.fn()
  }
}));

describe('Chat Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock<any>;
  let setHeaderMock: jest.Mock<any>;
  let ChatControllerModule: any;
  let ChatServiceMock: any;
  let RouterAgentMock: any;

  beforeAll(async () => {
    ChatControllerModule = await import('../../src/controllers/chat.controller.js');
    const chatServiceModule = await import('../../src/services/chat.service.js');
    ChatServiceMock = chatServiceModule.ChatService;
    const routerModule = await import('../../src/agents/router.agent.js');
    RouterAgentMock = routerModule.RouterAgent;
  });

  beforeEach(() => {
    mockReq = {
      user: { id: 'user_1', name: 'Test', email: 'test@test.com', phone: null, address: null },
      params: {},
      body: {}
    };
    jsonMock = jest.fn();
    setHeaderMock = jest.fn();
    mockRes = { json: jsonMock, setHeader: setHeaderMock };
    jest.clearAllMocks();
  });

  it('lists conversations', async () => {
    const mockConvs = [{ id: '1' }];
    prismaMock.conversation.findMany.mockResolvedValueOnce(mockConvs as any);

    await ChatControllerModule.ChatController.listConversations(mockReq as Request, mockRes as Response);

    expect(prismaMock.conversation.findMany).toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockConvs });
  });

  it('listConversations throws 401 if user not found', async () => {
    mockReq.user = undefined;
    await expect(
      ChatControllerModule.ChatController.listConversations(mockReq as Request, mockRes as Response)
    ).rejects.toThrow(ApiError);
  });

  it('gets conversation', async () => {
    mockReq.params = { id: 'conv_1' };
    const mockConv = { id: 'conv_1', userId: 'user_1' };
    prismaMock.conversation.findUnique.mockResolvedValueOnce(mockConv as any);

    await ChatControllerModule.ChatController.getConversation(mockReq as Request, mockRes as Response);

    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: mockConv });
  });

  it('getConversation throws 404 if not found', async () => {
    mockReq.params = { id: 'conv_1' };
    prismaMock.conversation.findUnique.mockResolvedValueOnce(null);

    await expect(
      ChatControllerModule.ChatController.getConversation(mockReq as Request, mockRes as Response)
    ).rejects.toThrow(ApiError);
  });

  it('getConversation throws 403 if user mismatch', async () => {
    mockReq.params = { id: 'conv_1' };
    prismaMock.conversation.findUnique.mockResolvedValueOnce({ id: 'conv_1', userId: 'user_2' } as any);

    await expect(
      ChatControllerModule.ChatController.getConversation(mockReq as Request, mockRes as Response)
    ).rejects.toThrow(ApiError);
  });

  it('deletes conversation', async () => {
    mockReq.params = { id: 'conv_1' };
    prismaMock.conversation.findUnique.mockResolvedValueOnce({ id: 'conv_1', userId: 'user_1' } as any);

    await ChatControllerModule.ChatController.deleteConversation(mockReq as Request, mockRes as Response);

    expect(prismaMock.conversation.delete).toHaveBeenCalledWith({ where: { id: 'conv_1' } });
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: null });
  });

  it('deleteConversation throws 403 if user mismatch', async () => {
    mockReq.params = { id: 'conv_1' };
    prismaMock.conversation.findUnique.mockResolvedValueOnce({ id: 'conv_1', userId: 'user_2' } as any);

    await expect(
      ChatControllerModule.ChatController.deleteConversation(mockReq as Request, mockRes as Response)
    ).rejects.toThrow(ApiError);
  });

  it('deleteConversation throws 404 if not found', async () => {
    mockReq.params = { id: 'conv_1' };
    prismaMock.conversation.findUnique.mockResolvedValueOnce(null);

    await expect(
      ChatControllerModule.ChatController.deleteConversation(mockReq as Request, mockRes as Response)
    ).rejects.toThrow(ApiError);
  });

  it('sends message and pipes stream', async () => {
    mockReq.body = { content: 'hello', conversationId: 'conv_1' };
    ChatServiceMock.getOrCreateConversation.mockResolvedValueOnce({ id: 'conv_1' });
    
    const mockStream = { pipeUIMessageStreamToResponse: jest.fn() };
    RouterAgentMock.handleIncomingMessageStream.mockResolvedValueOnce(mockStream);

    await ChatControllerModule.ChatController.sendMessage(mockReq as Request, mockRes as Response);

    expect(ChatServiceMock.saveMessage).toHaveBeenCalledWith({
      conversationId: 'conv_1',
      role: 'user',
      content: 'hello'
    });
    expect(setHeaderMock).toHaveBeenCalledWith('x-conversation-id', 'conv_1');
    expect(mockStream.pipeUIMessageStreamToResponse).toHaveBeenCalledWith(mockRes);
  });

  it('sendMessage throws 400 if no content', async () => {
    mockReq.body = {};
    await expect(
      ChatControllerModule.ChatController.sendMessage(mockReq as Request, mockRes as Response)
    ).rejects.toThrow(ApiError);
  });

  it('sendMessage throws 401 if user ID is missing', async () => {
    mockReq.user = undefined;
    mockReq.body = { content: 'hello' };
    await expect(
      ChatControllerModule.ChatController.sendMessage(mockReq as Request, mockRes as Response)
    ).rejects.toThrow(ApiError);
  });

  it('sendMessage extracts content from messages array', async () => {
    mockReq.body = { messages: [{ content: 'old' }, { content: 'hello from array' }], id: 'conv_2' };
    ChatServiceMock.getOrCreateConversation.mockResolvedValueOnce({ id: 'conv_2' });
    
    const mockStream = { pipeUIMessageStreamToResponse: jest.fn() };
    RouterAgentMock.handleIncomingMessageStream.mockResolvedValueOnce(mockStream);

    await ChatControllerModule.ChatController.sendMessage(mockReq as Request, mockRes as Response);

    expect(ChatServiceMock.saveMessage).toHaveBeenCalledWith({
      conversationId: 'conv_2',
      role: 'user',
      content: 'hello from array'
    });
  });
});
