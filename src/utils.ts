export function wait(ms: number = 1000) {
  return new Promise(res => setTimeout(res, ms));
}

//TODO in the future add a way to escape the retries based on certian response types like 400 or 403
const retryDefaults = {
  retries: 3,
  backoff: 100,
};

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
