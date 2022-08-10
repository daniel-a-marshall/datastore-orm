export declare function wait(ms?: number): Promise<unknown>;
export declare function callWithRetry<T>(fn: () => Promise<T>, options?: {
    retries?: number;
    backoff?: number;
    escape?: (error: any) => boolean;
}): Promise<T>;
