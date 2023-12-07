import type { Transaction } from "@google-cloud/datastore";
import { Datastore, PropertyFilter } from "@google-cloud/datastore";
import { callWithRetry } from "./utils";

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

function getId(data: any): string | number {
  //used for creation and updates
  //items created with an id will not have a key in the mutationResult
  if (data.mutationResults) {
    return Number(data.mutationResults?.[0].key?.path?.[0].id);
  }
  return Number(data[Datastore.KEY].id) || data[Datastore.KEY].name;
}

type ModelOptions = {
  disableRetry?: boolean;
  retries?: number;
  backoff?: number;
};

export default function createORM(options?: {
  projectId: string;
  keyFilename: string;
}) {
  const store = new Datastore(options);

  function createModel<T extends { _id: string | number }>(
    kind: string,
    options?: ModelOptions
  ) {
    async function retry<U>(fn: () => Promise<U>) {
      if (options?.disableRetry) return fn();
      return callWithRetry(fn, {
        retries: options?.retries,
        backoff: options?.backoff,
        escape: (error: { message: string; status: number }) =>
          error.status > 399 && error.status < 500,
      });
    }

    async function create(
      data: Omit<T, "_id">,
      options?: {
        id?: string;
        validate?: (entity: Omit<T, "_id">) => any;
        transaction?: Transaction;
      }
    ): Promise<T> {
      const key = options?.id ? store.key([kind, options.id]) : store.key(kind);

      options?.validate?.(data);

      if (options?.transaction) {
        options.transaction.save({
          key,
          data,
        });
        return { ...data, _id: options?.id || "" } as T;
      }

      const [response] = await retry(() =>
        store.save({
          key,
          data,
        })
      );

      const _id = options?.id || getId(response);

      if (!_id) throw "entity is missing it's id";

      return { ...data, _id } as T;
    }

    async function get(
      id: string | number,
      options?: {
        validate?: (entity: T) => any;
        transaction?: Transaction;
      }
    ) {
      const key = store.key([kind, id]);

      const _store = options?.transaction || store;

      const [entity] = await retry(() => _store.get(key));

      if (!entity) return undefined;

      const _id = getId(entity);

      const entityWithId = { ...(entity as T), _id };

      options?.validate?.(entityWithId);

      return entityWithId;
    }

    //order of the ids may not match result order
    async function batchGet(
      ids: (string | number)[],
      options?: {
        validate?: (entities: T[]) => any;
        transaction?: Transaction;
      }
    ) {
      const keys = ids.map((id) => store.key([kind, id]));

      const _store = options?.transaction || store;

      const [entities] = await retry(() => _store.get(keys));

      const entitiesWithIds: T[] = entities.map((entity: any) => ({
        ...entity,
        _id: getId(entity),
      }));

      options?.validate?.(entitiesWithIds);

      return entitiesWithIds;
    }

    //TODO need to add a way to use the cursor with limit
    async function query(
      queryOptions?: QueryOptions<T>,
      options?: {
        validate?: (entities: T[]) => any;
        transaction?: Transaction;
      }
    ): Promise<T[]> {
      const _store = options?.transaction || store;
      const query = _store.createQuery(kind);

      //filters
      queryOptions?.filters?.forEach(([field, operator, value]) => {
        query.filter(new PropertyFilter(field as string, operator, value));
      });

      //orders
      queryOptions?.orders?.forEach(({ field, descending }) => {
        query.order(field as string, { descending });
      });

      //limit
      if (queryOptions?.limit) query.limit(queryOptions.limit);

      //select
      if (queryOptions?.select) query.select(queryOptions.select as string[]);

      const [entities] = await retry(() => _store.runQuery(query));
      const entitiesWithIds = entities.map((entity) => ({
        ...entity,
        _id: getId(entity),
      }));

      options?.validate?.(entitiesWithIds);

      return entitiesWithIds;
    }

    async function update(
      id: string | number,
      update:
        | Partial<Omit<T, "_id">>
        | ((entity: T) => Partial<Omit<T, "_id">>),
      options?: {
        validate?: (entity: T) => any;
        transaction?: Transaction;
      }
    ): Promise<T> {
      const key = store.key([kind, id]);

      //any validation is passed to the get
      const entity = await retry(() => get(id, options));

      if (!entity) throw "entity not found";

      const parsedUpdate =
        typeof update === "function" ? update(entity) : update;

      const { _id, ...data } = entity;

      if (options?.transaction) {
        options.transaction.save({
          key,
          data: { ...data, ...parsedUpdate },
        });
      } else {
        await retry(() =>
          store.save({
            key,
            data: { ...data, ...parsedUpdate },
          })
        );
      }

      return { ...data, ...parsedUpdate, _id: id } as T;
    }

    async function batchUpdate(
      ids: (string | number)[],
      update: (entity: T) => T,
      options?: {
        validate?: (entities: T[]) => any;
        transaction?: Transaction;
      }
    ) {
      const keys = ids.map((id) => store.key([kind, id]));

      //any validation is passed to the get
      const entities = await retry(() => batchGet(ids, options));

      if (!entities || entities.length === 0) throw "no entities found";

      const updatedEntities = entities.map(update);
      const saveArray = updatedEntities.map(({ _id, ...data }) => ({
        key: store.key([kind, _id]),
        data,
      }));

      if (options?.transaction) {
        options.transaction.save(saveArray);
      } else {
        await retry(() => store.save(saveArray));
      }

      return updatedEntities;
    }

    async function destroy(
      id: string | number,
      options?: {
        validate?: (entity: T) => any;
        transaction?: Transaction;
      }
    ) {
      const key = store.key([kind, id]);

      //any validation is passed to the get
      const entity = await retry(() => get(id, options));

      if (!entity) throw "entity not found";

      if (options?.transaction) {
        options.transaction.delete(key);
      } else {
        await retry(() => store.delete(key));
      }

      return { message: "delete successful" };
    }

    async function batchDestroy(
      ids: (string | number)[],
      options?: {
        validate?: (entities: T[]) => any;
        transaction?: Transaction;
      }
    ) {
      const keys = ids.map((id) => store.key([kind, id]));

      //any validation is passed to the get
      const entities = await retry(() => batchGet(ids, options));

      if (!entities || entities.length === 0) throw "no entities found";

      if (options?.transaction) {
        options.transaction.delete(keys);
      } else {
        await retry(() => store.delete(keys));
      }

      return { message: "delete successful" };
    }

    return {
      create,
      get,
      batchGet,
      query,
      update,
      batchUpdate,
      destroy,
      batchDestroy,
    };
  }

  async function withTransaction(
    fn: (transaction: Transaction) => Promise<void>
  ) {
    const transaction = store.transaction();
    try {
      await transaction.run();

      await fn(transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  return {
    createModel,
    withTransaction,
  };
}
