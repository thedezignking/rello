import { currentBudget } from "./request-budget";

export class RequestBodyError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readBytes(request: Request, maximum: number) {
  if (Number(request.headers.get("content-length") ?? 0) > maximum)
    throw new RequestBodyError(413, "That request is too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  const signal = AbortSignal.any([
    AbortSignal.timeout(15000),
    ...(request.signal ? [request.signal] : []),
    ...(currentBudget() ? [currentBudget()!.signal] : []),
  ]);
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      if (signal.aborted) throw new RequestBodyError(408, "That upload took too long. Try again.");
      const part = await reader.read();
      if (signal.aborted) throw new RequestBodyError(408, "That upload took too long. Try again.");
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new RequestBodyError(413, "That request is too large.");
      }
      chunks.push(part.value);
    }
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function readJSON(request: Request, maximum = 256 * 1024): Promise<unknown> {
  try {
    return JSON.parse(new TextDecoder().decode(await readBytes(request, maximum)));
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400, "That request couldn't be read.");
  }
}
