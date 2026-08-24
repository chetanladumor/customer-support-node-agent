import { describe, it, expect } from '@jest/globals';

describe('Agent Service', () => {
  let AgentService: any;
  let AGENT_REGISTRY: any;

  beforeAll(async () => {
    const module = await import('../../src/services/agent.service.js');
    AgentService = module.AgentService;
    AGENT_REGISTRY = module.AGENT_REGISTRY;
  });
  it('returns all agents', () => {
    const agents = AgentService.getAllAgents();
    expect(agents).toEqual(AGENT_REGISTRY);
    expect(agents.length).toBeGreaterThan(0);
  });

  it('returns agent by type', () => {
    const agent = AgentService.getAgentByType('ORDER');
    expect(agent).toBeDefined();
    expect(agent?.type).toBe('ORDER');
  });

  it('handles lowercase type lookup', () => {
    const agent = AgentService.getAgentByType('order');
    expect(agent).toBeDefined();
    expect(agent?.type).toBe('ORDER');
  });

  it('returns undefined for unknown agent', () => {
    const agent = AgentService.getAgentByType('UNKNOWN');
    expect(agent).toBeUndefined();
  });
});
