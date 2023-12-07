"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const datastore_1 = require("@google-cloud/datastore");
const utils_1 = require("./utils");
function getId(data) {
    var _a, _b, _c;
    //used for creation and updates
    //items created with an id will not have a key in the mutationResult
    if (data.mutationResults) {
        return Number((_c = (_b = (_a = data.mutationResults) === null || _a === void 0 ? void 0 : _a[0].key) === null || _b === void 0 ? void 0 : _b.path) === null || _c === void 0 ? void 0 : _c[0].id);
    }
    return Number(data[datastore_1.Datastore.KEY].id) || data[datastore_1.Datastore.KEY].name;
}
function createORM(options) {
    const store = new datastore_1.Datastore(options);
    function createModel(kind, options) {
        function retry(fn) {
            return __awaiter(this, void 0, void 0, function* () {
                if (options === null || options === void 0 ? void 0 : options.disableRetry)
                    return fn();
                return (0, utils_1.callWithRetry)(fn, {
                    retries: options === null || options === void 0 ? void 0 : options.retries,
                    backoff: options === null || options === void 0 ? void 0 : options.backoff,
                    escape: (error) => error.status > 399 && error.status < 500,
                });
            });
        }
        function create(data, options) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                const key = (options === null || options === void 0 ? void 0 : options.id) ? store.key([kind, options.id]) : store.key(kind);
                (_a = options === null || options === void 0 ? void 0 : options.validate) === null || _a === void 0 ? void 0 : _a.call(options, data);
                if (options === null || options === void 0 ? void 0 : options.transaction) {
                    options.transaction.save({
                        key,
                        data,
                    });
                    return Object.assign(Object.assign({}, data), { _id: (options === null || options === void 0 ? void 0 : options.id) || "" });
                }
                const [response] = yield retry(() => store.save({
                    key,
                    data,
                }));
                const _id = (options === null || options === void 0 ? void 0 : options.id) || getId(response);
                if (!_id)
                    throw "entity is missing it's id";
                return Object.assign(Object.assign({}, data), { _id });
            });
        }
        function get(id, options) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                const key = store.key([kind, id]);
                const _store = (options === null || options === void 0 ? void 0 : options.transaction) || store;
                const [entity] = yield retry(() => _store.get(key));
                if (!entity)
                    return undefined;
                const _id = getId(entity);
                const entityWithId = Object.assign(Object.assign({}, entity), { _id });
                (_a = options === null || options === void 0 ? void 0 : options.validate) === null || _a === void 0 ? void 0 : _a.call(options, entityWithId);
                return entityWithId;
            });
        }
        //order of the ids may not match result order
        function batchGet(ids, options) {
            var _a;
            return __awaiter(this, void 0, void 0, function* () {
                const keys = ids.map((id) => store.key([kind, id]));
                const _store = (options === null || options === void 0 ? void 0 : options.transaction) || store;
                const [entities] = yield retry(() => _store.get(keys));
                const entitiesWithIds = entities.map((entity) => (Object.assign(Object.assign({}, entity), { _id: getId(entity) })));
                (_a = options === null || options === void 0 ? void 0 : options.validate) === null || _a === void 0 ? void 0 : _a.call(options, entitiesWithIds);
                return entitiesWithIds;
            });
        }
        //TODO need to add a way to use the cursor with limit
        function query(queryOptions, options) {
            var _a, _b, _c;
            return __awaiter(this, void 0, void 0, function* () {
                const _store = (options === null || options === void 0 ? void 0 : options.transaction) || store;
                const query = _store.createQuery(kind);
                //filters
                (_a = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.filters) === null || _a === void 0 ? void 0 : _a.forEach(([field, operator, value]) => {
                    query.filter(new datastore_1.PropertyFilter(field, operator, value));
                });
                //orders
                (_b = queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.orders) === null || _b === void 0 ? void 0 : _b.forEach(({ field, descending }) => {
                    query.order(field, { descending });
                });
                //limit
                if (queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.limit)
                    query.limit(queryOptions.limit);
                //select
                if (queryOptions === null || queryOptions === void 0 ? void 0 : queryOptions.select)
                    query.select(queryOptions.select);
                const [entities] = yield retry(() => _store.runQuery(query));
                const entitiesWithIds = entities.map((entity) => (Object.assign(Object.assign({}, entity), { _id: getId(entity) })));
                (_c = options === null || options === void 0 ? void 0 : options.validate) === null || _c === void 0 ? void 0 : _c.call(options, entitiesWithIds);
                return entitiesWithIds;
            });
        }
        function update(id, update, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const key = store.key([kind, id]);
                //any validation is passed to the get
                const entity = yield retry(() => get(id, options));
                if (!entity)
                    throw "entity not found";
                const parsedUpdate = typeof update === "function" ? update(entity) : update;
                const { _id } = entity, data = __rest(entity, ["_id"]);
                if (options === null || options === void 0 ? void 0 : options.transaction) {
                    options.transaction.save({
                        key,
                        data: Object.assign(Object.assign({}, data), parsedUpdate),
                    });
                }
                else {
                    yield retry(() => store.save({
                        key,
                        data: Object.assign(Object.assign({}, data), parsedUpdate),
                    }));
                }
                return Object.assign(Object.assign(Object.assign({}, data), parsedUpdate), { _id: id });
            });
        }
        function batchUpdate(ids, update, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const keys = ids.map((id) => store.key([kind, id]));
                //any validation is passed to the get
                const entities = yield retry(() => batchGet(ids, options));
                if (!entities || entities.length === 0)
                    throw "no entities found";
                const updatedEntities = entities.map(update);
                const saveArray = updatedEntities.map((_a) => {
                    var { _id } = _a, data = __rest(_a, ["_id"]);
                    return ({
                        key: store.key([kind, _id]),
                        data,
                    });
                });
                if (options === null || options === void 0 ? void 0 : options.transaction) {
                    options.transaction.save(saveArray);
                }
                else {
                    yield retry(() => store.save(saveArray));
                }
                return updatedEntities;
            });
        }
        function destroy(id, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const key = store.key([kind, id]);
                //any validation is passed to the get
                const entity = yield retry(() => get(id, options));
                if (!entity)
                    throw "entity not found";
                if (options === null || options === void 0 ? void 0 : options.transaction) {
                    options.transaction.delete(key);
                }
                else {
                    yield retry(() => store.delete(key));
                }
                return { message: "delete successful" };
            });
        }
        function batchDestroy(ids, options) {
            return __awaiter(this, void 0, void 0, function* () {
                const keys = ids.map((id) => store.key([kind, id]));
                //any validation is passed to the get
                const entities = yield retry(() => batchGet(ids, options));
                if (!entities || entities.length === 0)
                    throw "no entities found";
                if (options === null || options === void 0 ? void 0 : options.transaction) {
                    options.transaction.delete(keys);
                }
                else {
                    yield retry(() => store.delete(keys));
                }
                return { message: "delete successful" };
            });
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
    function withTransaction(fn) {
        return __awaiter(this, void 0, void 0, function* () {
            const transaction = store.transaction();
            try {
                yield transaction.run();
                yield fn(transaction);
                yield transaction.commit();
            }
            catch (error) {
                yield transaction.rollback();
                throw error;
            }
        });
    }
    return {
        createModel,
        withTransaction,
    };
}
exports.default = createORM;
