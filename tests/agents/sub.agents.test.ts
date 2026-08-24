import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

jest.unstable_mockModule('../../src/tools/database.tools.js', () => ({
  DatabaseTools: {
    getOrderStatus: jest.fn<any>().mockResolvedValue({ success: true }),
    listUserOrders: jest.fn<any>().mockResolvedValue({ success: true }),
    getInvoiceDetails: jest.fn<any>().mockResolvedValue({ success: true }),
    getInvoiceByOrder: jest.fn<any>().mockResolvedValue({ success: true }),
    searchKnowledgeBase: jest.fn<any>().mockResolvedValue({ success: true })
  }
}));

describe('Sub Agents', () => {
  let getSubAgents: any;
  let DatabaseToolsMock: any;

  beforeAll(async () => {
    const module = await import('../../src/agents/sub.agents.js');
    getSubAgents = module.getSubAgents;
    const dbModule = await import('../../src/tools/database.tools.js');
    DatabaseToolsMock = dbModule.DatabaseTools;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ORDER agent provides tools that call DatabaseTools with userId', async () => {
    const agents = getSubAgents('user_1');
    await agents.ORDER.tools.getOrderStatus.execute({ orderNumber: '123' });
    expect(DatabaseToolsMock.getOrderStatus).toHaveBeenCalledWith({ orderNumber: '123', userId: 'user_1' });

    await agents.ORDER.tools.listUserOrders.execute({});
    expect(DatabaseToolsMock.listUserOrders).toHaveBeenCalledWith({ userId: 'user_1' });
  });

  it('BILLING agent provides tools that call DatabaseTools with userId', async () => {
    const agents = getSubAgents('user_1');
    await agents.BILLING.tools.getInvoiceDetails.execute({ invoiceNumber: 'INV-1' });
    expect(DatabaseToolsMock.getInvoiceDetails).toHaveBeenCalledWith({ invoiceNumber: 'INV-1', userId: 'user_1' });

    await agents.BILLING.tools.getInvoiceByOrder.execute({ orderNumber: '123' });
    expect(DatabaseToolsMock.getInvoiceByOrder).toHaveBeenCalledWith({ orderNumber: '123', userId: 'user_1' });
  });

  it('SUPPORT agent provides tools that call DatabaseTools with userId', async () => {
    const agents = getSubAgents('user_1');
    await agents.SUPPORT.tools.searchKnowledgeBase.execute({ query: 'policy', language: 'en' });
    expect(DatabaseToolsMock.searchKnowledgeBase).toHaveBeenCalledWith({ query: 'policy', language: 'en', userId: 'user_1' });
  });
});
