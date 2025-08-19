# @react-llm-fiber/runtime

Framework-agnostic contracts and helpers for react-llm-fiber.

- **Readable public API**: `Delta` with `type` discriminant
- **Compact wire**: `WireDelta` with short keys and codecs

```ts
import { type Delta, encodeDelta, decodeDelta } from '@react-llm-fiber/runtime';
```
