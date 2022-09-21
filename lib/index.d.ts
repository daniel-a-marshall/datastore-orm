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
    create: (data: Omit<T, "_id">, id?: string, validate?: ((entity: Omit<T, "_id">) => any) | undefined) => void;
    get: (id: string | number, validate?: (entity: T) => void) => Promise<T | undefined>;
    query: (options?: QueryOptions, validate?: (entities: T[]) => void) => Promise<T[]>;
    update: (id: string | number, update: Partial<Omit<T, "_id">> | ((entity: T) => Partial<Omit<T, "_id">>), validate?: ((entity: T) => any) | undefined) => void;
    destroy: (id: string | number, validate?: (entity: T) => void) => void;
};
export declare type OrmModel<T> = {
    create: (data: Omit<T, "_id">, id?: string, validate?: ((entity: Omit<T, "_id">) => any) | undefined) => Promise<T>;
    get: (id: string | number, validate?: (entity: T) => void) => Promise<T | undefined>;
    query: (options?: QueryOptions, validate?: (entities: T[]) => void) => Promise<T[]>;
    update: (id: string | number, update: Partial<Omit<T, "_id">> | ((entity: T) => Partial<Omit<T, "_id">>), validate?: ((entity: T) => any) | undefined) => Promise<T>;
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
