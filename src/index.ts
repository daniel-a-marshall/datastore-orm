import type { Transaction } from "@google-cloud/datastore";
import { Datastore } from "@google-cloud/datastore";

export type QueryFilter = [
  string,
  "=" | "<" | "<=" | ">" | ">=",
  string | number
];

export type QueryOrder = {
  field: string;
  descending?: boolean;
};

export type QueryOptions = {
  filters?: QueryFilter[];
  orders?: QueryOrder[];
  limit?: number;
  select?: string[];
};

export type OrmTransaction<T> = {
  transaction: Transaction;
  create: (data: Omit<T, "_id">) => void;
  get: (id: string | number, validate?: (entity: T) => void) => Promise<T>;
  query: (
    options?: QueryOptions,
    validate?: (entities: T[]) => void
  ) => Promise<T[]>;
  update: (
    id: string | number,
    change: Partial<Omit<T, "_id">>,
    validate?: (entity: T) => void
  ) => void;
  destroy: (id: string | number, validate?: (entity: T) => void) => void;
};

export type OrmModel<T> = {
  create: (data: Omit<T, "_id">) => Promise<T>;
  get: (id: string | number, validate?: (entity: T) => void) => Promise<T>;
  query: (
    options?: QueryOptions,
    validate?: (entities: T[]) => void
  ) => Promise<T[]>;
  update: (
    id: string | number,
    change: Partial<Omit<T, "_id">>,
    validate?: (entity: T) => void
  ) => Promise<T>;
  destroy: (
    id: string | number,
    validate?: (entity: T) => void
  ) => Promise<any>;
  transaction: (
    func: (transaction: OrmTransaction<T>) => void
  ) => Promise<void>;
};

function getId(data: any): string | number {
  if (data.mutationResults) {
    return data.mutationResults?.[0].key?.path?.[0].id;
  }
  return Number(data[Datastore.KEY].id) || data[Datastore.KEY].name;
}

export default function createORM(options?: {
  projectId: string;
  keyFilename: string;
}) {
  //@ts-ignore
  const store = new Datastore(options);

  function createModel<T extends { _id: string | number }>(
    kind: string
  ): OrmModel<T> {
    async function create(
      data: Omit<T, "_id">,
      id?: string,
      validate?: (entity: Omit<T, "_id">) => any
    ): Promise<T> {
      const key = id ? store.key([kind, id]) : store.key(kind);

      validate?.(data);

      const [response] = await store.save({
        key,
        data,
      });

      const _id = getId(response);

      if (!_id) throw "entity is missing it's id";

      return { ...data, _id } as T;
    }

    async function get(
      id: string | number,
      validate?: (entity: T) => any
    ): Promise<T> {
      const key = store.key([kind, id]);

      const [entity] = await store.get(key);

      if (!entity) throw { message: "entity not found", status: 404 };

      const _id = getId(entity);

      const entityWithId = { ...(entity as T), _id };

      validate?.(entityWithId);

      return entityWithId;
    }

    async function query(
      options?: QueryOptions,
      validate?: (entities: T[]) => any
    ): Promise<T[]> {
      const query = store.createQuery(kind);

      //filters
      options?.filters?.forEach(([field, operator, value]) => {
        query.filter(field, operator, value);
      });

      //orders
      options?.orders?.forEach(({ field, descending }) => {
        query.order(field, { descending });
      });

      //limit
      if (options?.limit) query.limit(options.limit);

      //select
      if (options?.select) query.select(options.select);

      const [entities] = await store.runQuery(query);
      const entitiesWithIds = entities.map(entity => ({
        ...entity,
        _id: getId(entity),
      }));

      validate?.(entitiesWithIds);

      return entitiesWithIds;
    }

    async function update(
      id: string | number,
      update: Partial<Omit<T, "_id">>,
      validate?: (entity: T) => any
    ): Promise<T> {
      //TODO should we proactively strip the id
      const key = store.key([kind, id]);

      const entity = await get(id);

      if (!entity) throw "entity not found";

      validate?.(entity);

      const { _id, ...data } = entity;

      await store.save({
        key,
        data: { ...data, ...update },
      });

      return { ...data, ...update, _id: id } as T;
    }

    async function destroy(id: string | number, validate?: (entity: T) => any) {
      const key = store.key([kind, id]);

      const entity = await get(id);

      if (!entity) throw "entity not found";

      validate?.(entity);

      await store.delete(key);

      return { message: "delete successful" };
    }

    async function transaction(func: (transaction: OrmTransaction<T>) => void) {
      const transaction = store.transaction();

      function create(
        data: Omit<T, "_id">,
        id?: string,
        validate?: (entity: Omit<T, "_id">) => any
      ) {
        const key = id ? store.key([kind, id]) : store.key(kind);

        validate?.(data);

        return transaction.save({
          key,
          data,
        });
      }

      async function get(
        id: string | number,
        validate?: (entity: T) => any
      ): Promise<T> {
        const key = store.key([kind, id]);

        const [entity] = await transaction.get(key);

        if (!entity) throw "entity not found";

        const _id = getId(entity);

        const entityWithId = { ...entity, _id };

        validate?.(entityWithId);

        return entityWithId;
      }

      async function query(
        options?: QueryOptions,
        validate?: (entities: T[]) => any
      ): Promise<T[]> {
        const query = transaction.createQuery(kind);

        //filters
        options?.filters?.forEach(([field, operator, value]) => {
          query.filter(field, operator, value);
        });

        //orders
        options?.orders?.forEach(({ field, descending }) => {
          query.order(field, { descending });
        });

        //limit
        if (options?.limit) query.limit(options?.limit);

        //select
        if (options?.select) query.select(options.select);

        const [entities] = await transaction.runQuery(query);

        const entitiesWithIds = entities.map(entity => ({
          ...entity,
          id: getId(entity),
        }));

        validate?.(entitiesWithIds);

        return entitiesWithIds;
      }

      async function update(
        id: string | number,
        update: Partial<Omit<T, "_id">>,
        validate?: (entity: T) => any
      ) {
        const key = store.key([kind, id]);

        const entity = await get(id);

        if (!entity) throw "entity not found";

        validate?.(entity);

        const { _id, ...data } = entity;

        return transaction.save({
          key,
          data: { ...data, ...update },
        });
      }

      async function destroy(
        id: string | number,
        validate?: (entity: T) => any
      ) {
        const key = store.key([kind, id]);

        const entity = await get(id);

        if (!entity) throw "entity not found";

        validate?.(entity);

        return transaction.delete(key);
      }

      try {
        await transaction.run();
        func({ transaction, create, get, query, update, destroy });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      return;
    }

    return { create, get, query, update, transaction, destroy };
  }

  return {
    createModel,
  };
}
