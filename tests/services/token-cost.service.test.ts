import { describe, it, expect, beforeEach } from '@jest/globals';
import { TokenCostService } from '../../src/services/token-cost.service';

describe('TokenCostService', () => {
  beforeEach(() => {
    // Reset custom registrations if any
    TokenCostService.resetRegistry();
  });

  it('calculates cost correctly for Gemini 1.5/2.0 Flash', () => {
    // 1,000,000 prompt tokens = $0.075, 1,000,000 completion tokens = $0.30
    // For 1,000 prompt tokens: $0.000075
    // For 500 completion tokens: $0.00015
    const result = TokenCostService.calculateCost('gemini-3.6-flash', {
      promptTokens: 1000,
      completionTokens: 500,
    });

    expect(result.model).toBe('gemini-3.6-flash');
    expect(result.inputTokens).toBe(1000);
    expect(result.outputTokens).toBe(500);
    expect(result.totalTokens).toBe(1500);
    expect(result.ratesApplied.inputPerMillion).toBe(0.075);
    expect(result.ratesApplied.outputPerMillion).toBe(0.30);
    expect(result.cost.inputCost).toBeCloseTo(0.000075, 6);
    expect(result.cost.outputCost).toBeCloseTo(0.00015, 6);
    expect(result.cost.totalCost).toBeCloseTo(0.000225, 6);
    expect(result.cost.currency).toBe('USD');
  });

  it('calculates cost correctly for Claude 3.5 Sonnet', () => {
    // Input: $3.00 / 1M, Output: $15.00 / 1M
    const result = TokenCostService.calculateCost('claude-3-5-sonnet', {
      promptTokens: 2000,
      completionTokens: 400,
    });

    expect(result.ratesApplied.inputPerMillion).toBe(3.00);
    expect(result.ratesApplied.outputPerMillion).toBe(15.00);
    expect(result.cost.inputCost).toBeCloseTo(0.006, 6);
    expect(result.cost.outputCost).toBeCloseTo(0.006, 6);
    expect(result.cost.totalCost).toBeCloseTo(0.012, 6);
  });

  it('calculates zero cost for local models (Ollama / Llama)', () => {
    const result = TokenCostService.calculateCost('llama3.1', {
      promptTokens: 5000,
      completionTokens: 1200,
    });

    expect(result.ratesApplied.inputPerMillion).toBe(0);
    expect(result.ratesApplied.outputPerMillion).toBe(0);
    expect(result.cost.inputCost).toBe(0);
    expect(result.cost.outputCost).toBe(0);
    expect(result.cost.totalCost).toBe(0);
  });

  it('allows dynamic registration of new models at runtime', () => {
    TokenCostService.registerModelPricing('my-custom-fine-tuned-model', {
      inputPerMillion: 1.20,
      outputPerMillion: 4.80,
    });

    const result = TokenCostService.calculateCost('my-custom-fine-tuned-model', {
      promptTokens: 10000,
      completionTokens: 1000,
    });

    expect(result.ratesApplied.inputPerMillion).toBe(1.20);
    expect(result.ratesApplied.outputPerMillion).toBe(4.80);
    expect(result.cost.inputCost).toBeCloseTo(0.012, 6);
    expect(result.cost.outputCost).toBeCloseTo(0.0048, 6);
    expect(result.cost.totalCost).toBeCloseTo(0.0168, 6);
  });

  it('safely handles unknown models with zero rate and warning', () => {
    const result = TokenCostService.calculateCost('some-completely-unknown-ai-model', {
      promptTokens: 100,
      completionTokens: 50,
    });

    expect(result.totalTokens).toBe(150);
    expect(result.cost.totalCost).toBe(0);
  });
});
