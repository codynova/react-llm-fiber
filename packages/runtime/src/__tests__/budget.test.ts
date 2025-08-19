import { describe, it, expect } from 'vitest';
import { createBudget, BudgetExceededError } from '../budget.js';
import type { Delta } from '../delta.js';

describe('Budget tracker', () => {
  it('accumulates and enforces USD budget', () => {
    const b = createBudget({ maxUSD: 1.0 });

    const m1: Delta = { type: 'meta', costUSD: 0.4 };
    const m2: Delta = { type: 'meta', costUSD: 0.6 };

    b.update(m1);
    expect(b.get().usd).toBeCloseTo(0.4, 10);

    b.update(m2);
    expect(b.get().usd).toBeCloseTo(1.0, 10);

    const over: Delta = { type: 'meta', costUSD: 0.001 };
    expect(() => b.update(over)).toThrow(BudgetExceededError);
  });

  it('accumulates token budgets independently', () => {
    const b = createBudget({ maxPromptTokens: 10, maxCompletionTokens: 5 });

    b.update({ type: 'meta', tokens: { prompt: 3, completion: 2 } });
    expect(b.get()).toMatchObject({ promptTokens: 3, completionTokens: 2 });

    b.update({ type: 'meta', tokens: { prompt: 7, completion: 3 } });
    expect(b.get()).toMatchObject({ promptTokens: 10, completionTokens: 5 });

    // next prompt token puts it over
    expect(() => b.update({ type: 'meta', tokens: { prompt: 1 } })).toThrow(BudgetExceededError);
  });

  it('ignores non-meta deltas', () => {
    const b = createBudget({});
    b.update({ type: 'token', chunk: 'hi' });
    expect(b.get()).toMatchObject({ usd: 0, promptTokens: 0, completionTokens: 0 });
  });
});
