/** Public (developer-facing) Delta type — readable discriminant `type` */
export type Phase = 'plan' | 'execute' | 'critic' | 'done';

export type SerializedError = {
  name: string;
  message: string;
  code?: string;
}

export type Delta =
  | { type: 'token'; chunk: string }
  | { type: 'tool_call'; name: string; args: unknown }
  | { type: 'tool_result'; name: string; result: unknown }
  | {
      type: 'meta';
      tokens?: { prompt?: number; completion?: number };
      costUSD?: number;
    }
  | { type: 'status'; phase: Phase }
  | { type: 'error'; error: SerializedError };

/** Compact wire format — short keys to reduce bandwidth */
export type WireDelta =
  | { t: 'token'; c: string }
  | { t: 'tool_call'; n: string; a: unknown }
  | { t: 'tool_result'; n: string; r: unknown }
  | { t: 'meta'; pt?: number; ct?: number; $?: number }
  | { t: 'status'; p: Phase }
  | { t: 'error'; e: { n: string; m: string; c?: string } };

/** Decode wire → public */
export const decodeDelta = (w: WireDelta): Delta => {
  switch (w.t) {
    case 'token':
      return { type: 'token', chunk: w.c };
    case 'tool_call':
      return { type: 'tool_call', name: w.n, args: w.a };
    case 'tool_result':
      return { type: 'tool_result', name: w.n, result: w.r };
    case 'meta':
      return {
        type: 'meta',
        tokens:
          w.pt !== undefined || w.ct !== undefined
            ? { prompt: w.pt, completion: w.ct }
            : undefined,
        costUSD: w.$,
      };
    case 'status':
      return { type: 'status', phase: w.p };
    case 'error':
      return {
        type: 'error',
        error: { name: w.e.n, message: w.e.m, code: w.e.c },
      };
  }
}

/** Encode public → wire */
export const encodeDelta = (d: Delta): WireDelta => {
  switch (d.type) {
    case 'token':
      return { t: 'token', c: d.chunk };
    case 'tool_call':
      return { t: 'tool_call', n: d.name, a: d.args };
    case 'tool_result':
      return { t: 'tool_result', n: d.name, r: d.result };
    case 'meta':
      return {
        t: 'meta',
        pt: d.tokens?.prompt,
        ct: d.tokens?.completion,
        $: d.costUSD,
      };
    case 'status':
      return { t: 'status', p: d.phase };
    case 'error':
      return {
        t: 'error',
        e: { n: d.error.name, m: d.error.message, c: d.error.code },
      };
  }
}

/** Handy type guards (optional but nice DX) */
export const isTokenDelta = (x: Delta): x is Extract<Delta, { type: 'token' }> =>
  x.type === 'token';
export const isMetaDelta = (x: Delta): x is Extract<Delta, { type: 'meta' }> =>
  x.type === 'meta';
