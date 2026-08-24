import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { ApiError } from '../../src/middleware/errorHandler.js';

jest.unstable_mockModule('../../src/services/agent.service.js', () => ({
  AgentService: {
    getAllAgents: jest.fn().mockReturnValue([{ id: 'ORDER' }, { id: 'SUPPORT' }]),
    getAgentByType: jest.fn().mockImplementation((type) => {
      if (type === 'ORDER') return { id: 'ORDER' };
      return undefined;
    })
  }
}));

describe('Agent Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock<any>;
  let AgentController: any;

  beforeAll(async () => {
    const module = await import('../../src/controllers/agent.controller.js');
    AgentController = module.AgentController;
  });
  let AgentControllerModule: any;

  beforeAll(async () => {
    AgentControllerModule = await import('../../src/controllers/agent.controller.js');
  });

  beforeEach(() => {
    mockReq = { params: {} };
    jsonMock = jest.fn();
    mockRes = { json: jsonMock };
    jest.clearAllMocks();
  });

  it('lists all agents', () => {
    AgentControllerModule.AgentController.listAgents(mockReq as Request, mockRes as Response);
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: [{ id: 'ORDER' }, { id: 'SUPPORT' }] });
  });

  it('gets capabilities for valid agent', () => {
    mockReq.params = { type: 'order' };
    AgentControllerModule.AgentController.getCapabilities(mockReq as Request, mockRes as Response);
    expect(jsonMock).toHaveBeenCalledWith({ success: true, data: { id: 'ORDER' } });
  });

  it('throws 404 for unknown agent', () => {
    mockReq.params = { type: 'unknown' };
    expect(() => {
      AgentControllerModule.AgentController.getCapabilities(mockReq as Request, mockRes as Response);
    }).toThrow(ApiError);
  });
});
