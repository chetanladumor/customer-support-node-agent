import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import type { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

jest.unstable_mockModule('../../src/db/prisma.js', () => ({
  prisma: prismaMock,
}));

jest.unstable_mockModule('../../src/services/rag.service.js', () => ({
  RagService: {
    searchKnowledgeBase: jest.fn<any>().mockResolvedValue([
      {
        title: 'Return Policy',
        content: '30 day returns',
        score: 95,
        vectorRank: 1,
        keywordRank: 2,
        knowledgeBaseId: 'kb_123'
      }
    ])
  }
}));

describe('DatabaseTools', () => {
  let DatabaseTools: any;

  beforeAll(async () => {
    const module = await import('../../src/tools/database.tools.js');
    DatabaseTools = module.DatabaseTools;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrderStatus', () => {
    it('returns an error if order is not found', async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      const result = await DatabaseTools.getOrderStatus({
        orderNumber: 'ORDER-123',
        userId: 'user_1'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('returns formatted order details if found', async () => {
      const mockOrder = {
        id: '1',
        orderNumber: 'ORDER-123',
        userId: 'user_1',
        status: 'SHIPPED',
        totalAmount: 99.99 as any,
        estimatedDelivery: new Date('2026-08-30'),
        carrier: 'DHL',
        trackingNumber: '12345',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          { productName: 'Laptop', quantity: 1 } as any
        ]
      };
      
      prismaMock.order.findFirst.mockResolvedValue(mockOrder as any);

      const result = await DatabaseTools.getOrderStatus({
        orderNumber: 'ORDER-123',
        userId: 'user_1'
      });

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order?.status).toBe('SHIPPED');
      expect(result.order?.items.length).toBe(1);
    });
    it('returns formatted order details if found', async () => {
      // (previous test logic remains intact, this chunk assumes it's right before searchKnowledgeBase)
    });
  });

  describe('listUserOrders', () => {
    it('returns orders list when found', async () => {
      const mockOrders = [
        { orderNumber: 'O-1', status: 'PENDING', totalAmount: 10, estimatedDelivery: new Date() },
        { orderNumber: 'O-2', status: 'SHIPPED', totalAmount: null, estimatedDelivery: null }
      ];
      prismaMock.order.findMany.mockResolvedValue(mockOrders as any);

      const result = await DatabaseTools.listUserOrders({ userId: 'u1' });
      expect(result.success).toBe(true);
      expect(result.orders?.length).toBe(2);
    });

    it('returns failure when no orders found', async () => {
      prismaMock.order.findMany.mockResolvedValue([]);
      const result = await DatabaseTools.listUserOrders({ userId: 'u1' });
      expect(result.success).toBe(false);
      expect(result.message).toContain('No orders found');
    });
  });

  describe('getInvoiceDetails', () => {
    it('returns invoice details if found', async () => {
      const mockInvoice = {
        invoiceNumber: 'INV-1',
        amount: 50.5,
        status: 'PAID',
        dueDate: new Date(),
        paidAt: new Date(),
        paymentMethod: 'CC',
        order: { orderNumber: 'O-1' }
      };
      prismaMock.invoice.findFirst.mockResolvedValue(mockInvoice as any);
      
      const result = await DatabaseTools.getInvoiceDetails({ invoiceNumber: 'INV-1', userId: 'u1' });
      expect(result.success).toBe(true);
      expect(result.invoice?.invoiceNumber).toBe('INV-1');
      expect(result.invoice?.amount).toBe(50.5);
    });

    it('returns error if invoice not found', async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(null);
      const result = await DatabaseTools.getInvoiceDetails({ invoiceNumber: 'INV-1', userId: 'u1' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('getInvoiceByOrder', () => {
    it('returns invoice if order matched', async () => {
      const mockInvoice = {
        invoiceNumber: 'INV-1',
        amount: null,
        status: 'PENDING',
        dueDate: null,
        paidAt: null,
        paymentMethod: null,
        order: null
      };
      prismaMock.invoice.findFirst.mockResolvedValue(mockInvoice as any);
      
      const result = await DatabaseTools.getInvoiceByOrder({ orderNumber: 'O-1', userId: 'u1' });
      expect(result.success).toBe(true);
      expect(result.invoice?.invoiceNumber).toBe('INV-1');
      expect(result.invoice?.amount).toBe(null);
    });

    it('returns error if no invoice matched', async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(null);
      const result = await DatabaseTools.getInvoiceByOrder({ orderNumber: 'O-1', userId: 'u1' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('No invoice found');
    });
  });

  describe('searchKnowledgeBase', () => {
    it('calls RagService with the correct parameters and formats output', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user_1',
        tenantId: 'tenant_A',
        country: 'CA',
        email: 'test@test.com',
        name: 'Test',
        phone: '123',
        address: '123 St',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await DatabaseTools.searchKnowledgeBase({
        query: 'returns',
        language: 'french',
        userId: 'user_1'
      });

      expect(result.success).toBe(true);
      expect(result.results?.length).toBe(1);
      expect(result.results?.[0].title).toBe('Return Policy');
      expect(result.results?.[0].rerankerScore).toBe('N/A');
    });

    it('returns failure message if no results found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const ragModule = await import('../../src/services/rag.service.js');
      (ragModule.RagService.searchKnowledgeBase as any).mockResolvedValueOnce([]);
      
      const result = await DatabaseTools.searchKnowledgeBase({ query: 'unknown', userId: 'u1' });
      expect(result.success).toBe(false);
      expect(result.message).toContain('No relevant articles found');
    });
  });
});
