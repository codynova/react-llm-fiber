/**
 * Simple SSE reader that splits `data:` frames.
 */
export const readSse = async (
  body: ReadableStream<Uint8Array>,
  onData: (jsonOrDone: any) => void
) => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let index: number;
    while ((index = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, index);
      buf = buf.slice(index + 2);

      // Collect all 'data:' lines within the frame
      const lines = frame.split('\n').filter((l) => l.startsWith('data:'));
      for (const line of lines) {
        const raw = line.slice(5).trim();
        if (!raw) continue;
        if (raw === '[DONE]') {
          onData('[DONE]');
          continue;
        }
        try {
          onData(JSON.parse(raw));
        } catch (err: any) {
          const error = { name: err?.name ?? 'Error', message: String(err?.message ?? err) };
          console.error('Error parsing `data:` line', error);
        }
      }
    }
  }

  // Flush remainder (rare)
  if (buf.trim().length > 0) {
    const maybe = buf.trim().split('\n').find((l) => l.startsWith('data:'));
    if (maybe) {
      const raw = maybe.slice(5).trim();
      if (raw === '[DONE]') onData('[DONE]');
      else {
        try {
          onData(JSON.parse(raw));
        } catch (err: any) {
          const error = { name: err?.name ?? 'Error', message: String(err?.message ?? err) };
          console.error('Error parsing `data:` line during flush', error);
        }
      }
    }
  }
};
