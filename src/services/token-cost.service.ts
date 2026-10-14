export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  currency?: string;
}

export interface TokenUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}

export interface CalculatedTokenCost {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  ratesApplied: {
    inputPerMillion: number;
    outputPerMillion: number;
    currency: string;
  };
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
  };
}

const DEFAULT_PRICING_TABLE: Record<string, ModelPricing> = {
  // Google Gemini Models
  "gemini-3.6-flash": { inputPerMillion: 0.075, outputPerMillion: 0.30, currency: "USD" },
  "gemini-2.0-flash": { inputPerMillion: 0.075, outputPerMillion: 0.30, currency: "USD" },
  "gemini-1.5-flash": { inputPerMillion: 0.075, outputPerMillion: 0.30, currency: "USD" },
  "gemini-1.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5.00, currency: "USD" },

  // Anthropic Claude Models
  "claude-3-5-sonnet": { inputPerMillion: 3.00, outputPerMillion: 15.00, currency: "USD" },
  "claude-3.5-sonnet": { inputPerMillion: 3.00, outputPerMillion: 15.00, currency: "USD" },
  "claude-3-5-haiku": { inputPerMillion: 0.80, outputPerMillion: 4.00, currency: "USD" },
  "claude-3.5-haiku": { inputPerMillion: 0.80, outputPerMillion: 4.00, currency: "USD" },

  // OpenAI Models
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.60, currency: "USD" },
  "gpt-4o": { inputPerMillion: 2.50, outputPerMillion: 10.00, currency: "USD" },

  // Local / Self-Hosted Models
  "llama3.1": { inputPerMillion: 0.0, outputPerMillion: 0.0, currency: "USD" },
  "llama3": { inputPerMillion: 0.0, outputPerMillion: 0.0, currency: "USD" },
  "ollama": { inputPerMillion: 0.0, outputPerMillion: 0.0, currency: "USD" },
};

export class TokenCostService {
  private static dynamicRegistry = new Map<string, ModelPricing>();

  /**
   * Reset runtime registrations to defaults (useful for tests)
   */
  static resetRegistry(): void {
    this.dynamicRegistry.clear();
  }

  /**
   * Dynamically register or override pricing for any model at runtime
   */
  static registerModelPricing(model: string, pricing: ModelPricing): void {
    this.dynamicRegistry.set(model.toLowerCase(), {
      ...pricing,
      currency: pricing.currency || "USD",
    });
  }

  /**
   * Resolve the active pricing for a given model
   */
  static getModelPricing(modelName: string): ModelPricing {
    const key = (modelName || "unknown").toLowerCase();

    // 1. Dynamic runtime registry
    if (this.dynamicRegistry.has(key)) {
      return this.dynamicRegistry.get(key)!;
    }

    // 2. Built-in defaults
    if (DEFAULT_PRICING_TABLE[key]) {
      return DEFAULT_PRICING_TABLE[key];
    }

    // 3. Pattern matching for local / free models
    if (/^(ollama|local|llama|qwen|mistral|phi|gemma)/i.test(key)) {
      return { inputPerMillion: 0, outputPerMillion: 0, currency: "USD" };
    }

    // 4. Fallback for completely unlisted models
    console.warn(`[TokenCostService] No pricing rate found for model "${modelName}". Defaulting to $0.00.`);
    return { inputPerMillion: 0, outputPerMillion: 0, currency: "USD" };
  }

  /**
   * Calculate precise input, output, and total costs for token usage
   */
  static calculateCost(modelName: string, usage: TokenUsageStats): CalculatedTokenCost {
    const pricing = this.getModelPricing(modelName);
    const promptTokens = usage.promptTokens || 0;
    const completionTokens = usage.completionTokens || 0;
    const totalTokens = usage.totalTokens || (promptTokens + completionTokens);

    const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
    const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;
    const totalCost = inputCost + outputCost;

    return {
      model: modelName,
      inputTokens: promptTokens,
      outputTokens: completionTokens,
      totalTokens,
      ratesApplied: {
        inputPerMillion: pricing.inputPerMillion,
        outputPerMillion: pricing.outputPerMillion,
        currency: pricing.currency || "USD",
      },
      cost: {
        inputCost: Number(inputCost.toFixed(8)),
        outputCost: Number(outputCost.toFixed(8)),
        totalCost: Number(totalCost.toFixed(8)),
        currency: pricing.currency || "USD",
      },
    };
  }
}
