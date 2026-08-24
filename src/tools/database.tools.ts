import { prisma } from "../db/prisma.js";

// ---------------------------------------------------------------------------
// Database Tools
// ---------------------------------------------------------------------------
// These functions will be exposed to the LLM (Vercel AI SDK) as "tools".
// The LLM can call them to look up live customer data in PostgreSQL.
// ---------------------------------------------------------------------------

export class DatabaseTools {
  /**
   * Look up an order by its orderNumber and verify it belongs to the user
   */
  static async getOrderStatus(args: { orderNumber: string; userId: string }) {
    const { orderNumber, userId } = args;
    
    console.log(`[Tool: getOrderStatus] Looking up ${orderNumber} for user ${userId}`);

    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        userId,
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      return {
        success: false,
        error: `Order ${orderNumber} not found or does not belong to this user.`,
      };
    }

    return {
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount ? Number(order.totalAmount) : null,
        estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.toISOString() : null,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
        })),
      },
    };
  }

  /**
   * List all recent orders for the given user
   */
  static async listUserOrders(args: { userId: string }) {
    const { userId } = args;
    console.log(`[Tool: listUserOrders] Listing orders for user ${userId}`);

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!orders || orders.length === 0) {
      return {
        success: false,
        message: "No orders found for this user.",
      };
    }

    return {
      success: true,
      orders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount ? Number(o.totalAmount) : null,
        estimatedDelivery: o.estimatedDelivery ? o.estimatedDelivery.toISOString() : null,
      })),
    };
  }
  /**
   * Look up an invoice by its invoiceNumber
   */
  static async getInvoiceDetails(args: { invoiceNumber: string; userId: string }) {
    const { invoiceNumber, userId } = args;

    console.log(`[Tool: getInvoiceDetails] Looking up ${invoiceNumber} for user ${userId}`);

    const invoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber,
        userId,
      },
      include: {
        order: {
          select: { orderNumber: true, status: true },
        },
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: `Invoice ${invoiceNumber} not found or does not belong to this user.`,
      };
    }

    return {
      success: true,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount ? Number(invoice.amount) : null,
        status: invoice.status,
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
        paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
        paymentMethod: invoice.paymentMethod,
        relatedOrder: invoice.order?.orderNumber,
      },
    };
  }

  /**
   * Look up an invoice by its related Order ID
   */
  static async getInvoiceByOrder(args: { orderNumber: string; userId: string }) {
    const { orderNumber, userId } = args;

    console.log(`[Tool: getInvoiceByOrder] Looking up invoice for order ${orderNumber} for user ${userId}`);

    const invoice = await prisma.invoice.findFirst({
      where: {
        userId,
        order: {
          orderNumber: orderNumber
        }
      },
      include: {
        order: {
          select: { orderNumber: true, status: true },
        },
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: `No invoice found for order ${orderNumber} or it does not belong to this user.`,
      };
    }

    return {
      success: true,
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount ? Number(invoice.amount) : null,
        status: invoice.status,
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
        paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
        paymentMethod: invoice.paymentMethod,
        relatedOrder: invoice.order?.orderNumber,
      },
    };
  }

  /**
   * Search the Knowledge Base for policies, guides, and troubleshooting steps
   */
  static async searchKnowledgeBase(args: { query: string; language?: string; userId: string }) {
    const { query, language, userId } = args;
    console.log(`[Tool: searchKnowledgeBase] Performing hybrid search for: "${query}" in ${language || 'english'} for user ${userId}`);
    
    // Fetch user details for Tenant and Country isolation
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const tenantId = user?.tenantId || "default_tenant";
    const country = user?.country || "US";

    const { RagService } = await import("../services/rag.service.js");
    
    // Perform Advanced RAG Search with Tenant/Country filtering and RRF scoring
    const results = await RagService.searchKnowledgeBase(query, tenantId, country, language || "english");
    
    if (!results || results.length === 0) {
      return {
        success: false,
        message: "No relevant articles found in the knowledge base for this query.",
      };
    }

    return {
      success: true,
      results: results.map((r) => ({
        title: r.title,
        content: r.content,
        rerankerScore: (r as any).rerankerScore ? (r as any).rerankerScore + "/100" : "N/A",
        rrfScore: (r as any).rrfScore ? ((r as any).rrfScore).toFixed(4) : "N/A",
        vectorRank: (r as any).vectorRank || "N/A",
        keywordRank: (r as any).keywordRank || "N/A",
        citation: `kb_${r.knowledgeBaseId}`,
      })),
    };
  }
}
