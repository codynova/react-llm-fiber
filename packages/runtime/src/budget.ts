import type { Delta } from './delta.js';

export type Budget = {
  maxUSD?: number;
  maxPromptTokens?: number;
  maxCompletionTokens?: number;
}

export type BudgetCounter = {
  usd: number;
  promptTokens: number;
  completionTokens: number;
}

export class BudgetExceededError extends Error {
  kind: keyof BudgetCounter;
  constructor(kind: keyof BudgetCounter, message: string) {
    super(message);
    this.name = 'BudgetExceededError';
    this.kind = kind;
  }
}

/**
 * Create a simple budget tracker.
 * Note: this increments counters only on `meta` deltas (where providers report usage).
 */
export const createBudget = (budget: Budget) => {
  const counters: BudgetCounter = { usd: 0, promptTokens: 0, completionTokens: 0 };

  function check(kind: keyof BudgetCounter, value: number | undefined, limit?: number) {
    if (limit === undefined || value === undefined) return;
    if (value > limit) {
      throw new BudgetExceededError(kind, `Budget exceeded for ${kind}: ${value} > ${limit}`);
    }
  }

  return {
    /** Read current counters */
    get(): BudgetCounter {
      return { ...counters };
    },

    /** Update from a new delta; throws if budget exceeded */
    update(delta: Delta) {
      if (delta.type === 'meta') {
        if (delta.costUSD != null) {
          counters.usd += delta.costUSD;
          check('usd', counters.usd, budget.maxUSD);
        }
        if (delta.tokens?.prompt != null) {
          counters.promptTokens += delta.tokens.prompt;
          check('promptTokens', counters.promptTokens, budget.maxPromptTokens);
        }
        if (delta.tokens?.completion != null) {
          counters.completionTokens += delta.tokens.completion;
          check('completionTokens', counters.completionTokens, budget.maxCompletionTokens);
        }
      }
    },
  };
}
