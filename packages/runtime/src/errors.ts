export type LlmErrorCode =
  | 'rate_limit'
  | 'auth'
  | 'content_policy'
  | 'tool_failure'
  | 'network'
  | 'parse'
  | 'timeout'
  | 'aborted'
  | 'unknown';

export class LlmError extends Error {
  code: LlmErrorCode;
  cause?: unknown;

  constructor(code: LlmErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
    this.cause = cause;
  }
}

/** Best-effort normalization from arbitrary thrown values */
export const normalizeError = (e: unknown): LlmError => {
  if (e instanceof LlmError) return e;

  // Fetch/Abort conventions
  if (typeof e === 'object' && e && 'name' in e && (e as any).name === 'AbortError') {
    return new LlmError('aborted', 'Operation aborted', e);
  }

  const msg =
    (typeof e === 'object' && e && 'message' in e && String((e as any).message)) ||
    (typeof e === 'string' ? e : 'Unknown error');

  // Heuristics by common codes/names
  const code: LlmErrorCode =
    /rate/i.test(msg) ? 'rate_limit' :
    /auth|key|unauthor/i.test(msg) ? 'auth' :
    /policy|content/i.test(msg) ? 'content_policy' :
    /timeout/i.test(msg) ? 'timeout' :
    /network|fetch|socket/i.test(msg) ? 'network' :
    /parse|json/i.test(msg) ? 'parse' :
    'unknown';

  return new LlmError(code, msg, e as any);
}
