import type { Transaction } from "@google-cloud/datastore";
export type QueryFilter<T> = [
    keyof T,
    "=" | "<" | "<=" | ">" | ">=",
    string | number
];
export type QueryOrder<T> = {
    field: keyof T;
    descending?: boolean;
};
export type QueryOptions<T> = {
    filters?: QueryFilter<T>[];
    orders?: QueryOrder<T>[];
    limit?: number;
    select?: (keyof T | "__key__")[];
};
type ModelOptions = {
    disableRetry?: boolean;
    retries?: number;
    backoff?: number;
};
export default function createORM(options?: {
    projectId: string;
    keyFilename: string;
}): {
    createModel: <T extends {
        _id: string | number;
    }>(kind: string, options?: ModelOptions) => {
        create: (data: Omit<T, "_id">, options?: {
            id?: string | undefined;
            validate?: ((entity: Omit<T, "_id">) => any) | undefined;
            transaction?: Transaction | undefined;
        } | undefined) => Promise<T>;
        get: (id: string | number, options?: {
            validate?: ((entity: T) => any) | undefined;
            transaction?: Transaction | undefined;
        } | undefined) => Promise<(T & {
            _id: string | number;
        }) | undefined>;
        batchGet: (ids: (string | number)[], options?: {
            validate?: ((entities: T[]) => any) | undefined;
            transaction?: Transaction | undefined;
        } | undefined) => Promise<T[]>;
        query: (queryOptions?: QueryOptions<T> | undefined, options?: {
            validate?: ((entities: T[]) => any) | undefined;
            transaction?: Transaction | undefined;
        } | undefined) => Promise<T[]>;
        update: (id: string | number, update: Partial<Omit<T, "_id">> | ((entity: T) => Partial<Omit<T, "_id">>), options?: {
            validate?: ((entity: T) => any) | undefined;
            transaction?: Transaction | undefined;
        } | undefined) => Promise<T>;
        batchUpdate: (ids: (string | number)[], update: (entity: T) => T, options?: {
            validate?: ((entities: T[]) => any) | undefined;
            transaction?: Transaction | undefined;
        } | undefined) => Promise<T[]>;
        destroy: (id: string | number, options?: {
            validate?: ((entity: T) => any) | undefined;
            transaction?: Transaction | undefined;
        } | undefined) => Promise<{
            message: string;
        }>;
        batchDestroy: (ids: (string | number)[], options?: {
            validate?: ((entities: T[]) => any) | undefined;
            transaction?: Transaction | undefined;
        } | undefined) => Promise<{
            message: string;
        }>;
    };
    withTransaction: (fn: (transaction: Transaction) => Promise<void>) => Promise<void>;
};
export {};
