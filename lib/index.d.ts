import type { Transaction } from "@google-cloud/datastore";
export declare type QueryFilter = [
    string,
    "=" | "<" | "<=" | ">" | ">=",
    string | number
];
export declare type QueryOrder = {
    field: string;
    descending?: boolean;
};
export declare type QueryOptions = {
    filters?: QueryFilter[];
    orders?: QueryOrder[];
    limit?: number;
    select?: string[];
};
declare type ModelOptions = {
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
    }>(kind: string, options?: ModelOptions | undefined) => {
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
        query: (queryOptions?: QueryOptions | undefined, options?: {
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
