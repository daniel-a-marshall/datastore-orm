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
export declare type OrmTransaction<T> = {
    transaction: Transaction;
    create: (data: Omit<T, "_id">) => void;
    get: (id: string | number, validate?: (entity: T) => void) => Promise<T>;
    query: (options?: QueryOptions, validate?: (entities: T[]) => void) => Promise<T[]>;
    update: (id: string | number, change: Partial<Omit<T, "_id">>, validate?: (entity: T) => void) => void;
    destroy: (id: string | number, validate?: (entity: T) => void) => void;
};
export declare type OrmModel<T> = {
    create: (data: Omit<T, "_id">) => Promise<T>;
    get: (id: string | number, validate?: (entity: T) => void) => Promise<T>;
    query: (options?: QueryOptions, validate?: (entities: T[]) => void) => Promise<T[]>;
    update: (id: string | number, change: Partial<Omit<T, "_id">>, validate?: (entity: T) => void) => Promise<T>;
    destroy: (id: string | number, validate?: (entity: T) => void) => Promise<any>;
    transaction: (func: (transaction: OrmTransaction<T>) => void) => Promise<void>;
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
    }>(kind: string, options?: ModelOptions | undefined) => OrmModel<T>;
};
export {};
