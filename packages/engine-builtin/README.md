# @react-llm-fiber/engine-builtin

## Usage example

```ts
import { createBuiltinEngine, createLocalToolRuntime } from '@react-llm-fiber/engine-builtin';

const tools = createLocalToolRuntime();
tools.register({ name: 'ping', description: 'returns pong' }, async () => 'pong');

const engine = createBuiltinEngine({
  baseUrl: process.env.LITELLM_BASE_URL!,
  defaultModel: 'gpt-4o-mini',
  headers: { Authorization: `Bearer ${process.env.LITELLM_KEY}` },
  tools,
});

// engine.run({ messages: [...] })
```


## Limitations

- Tool execution supports one pass of tool calls and a single follow-up assistant turn. Recursive tool loops can be added later.
- We don't currently propagate tool_call_id back to the model in the second pass; many providers work fine with plain tool content for simple tools. If you want strict OpenAI semantics, we can extend ChatMessage with an optional tool_call_id later.
- Token/cost meta is best-effort; proxies vary in how/when they emit usage during streams.
