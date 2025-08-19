export type ToolSpec = {
  name: string;
  description?: string;
  /** Optional schema object (e.g., Zod JSON schema, JSON Schema, etc.) */
  schema?: unknown;
};

export type ToolContext = {
  /** Run identifier for attribution/debug */
  runId: string;
  /** Abort if the parent run is cancelled */
  signal?: AbortSignal;
};

export type ToolImplementation = (args: unknown, ctx: ToolContext) => Promise<unknown> | unknown

export type ToolRuntime = {
  /** Register a tool; returns a deregister function */
  register: (spec: ToolSpec, impl?: ToolImplementation) => (() => void);

  /** Invoke an already-registered tool by name */
  call: (name: string, args: unknown, ctx: ToolContext) => Promise<unknown>;
}
