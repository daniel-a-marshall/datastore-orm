export function wait(ms: number = 1000) {
  return new Promise(res => setTimeout(res, ms));
}

export async function callWithRetry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    backoff?: number;
    escape?: (error: any) => boolean;
  }
): Promise<T> {
  const retries = options?.retries || 3;
  const backoff = options?.backoff || 100;

  try {
    return await fn();
  } catch (error) {
    if (retries === 1) throw error;
    if (options?.escape?.(error)) throw error;

    await wait(backoff);
    return callWithRetry(fn, {
      ...options,
      retries: retries - 1,
      backoff: backoff * 2,
    });
  }
}
