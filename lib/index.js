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
    if (data.mutationResults) {
        return (_c = (_b = (_a = data.mutationResults) === null || _a === void 0 ? void 0 : _a[0].key) === null || _b === void 0 ? void 0 : _b.path) === null || _c === void 0 ? void 0 : _c[0].id;
    }
    return Number(data[datastore_1.Datastore.KEY].id) || data[datastore_1.Datastore.KEY].name;
}
function createORM(options) {
    //@ts-ignore
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
        function create(data, id, validate) {
            return __awaiter(this, void 0, void 0, function* () {
                const key = id ? store.key([kind, id]) : store.key(kind);
                validate === null || validate === void 0 ? void 0 : validate(data);
                const [response] = yield retry(() => store.save({
                    key,
                    data,
                }));
                const _id = getId(response);
                if (!_id)
                    throw "entity is missing it's id";
                return Object.assign(Object.assign({}, data), { _id });
            });
        }
        function get(id, validate) {
            return __awaiter(this, void 0, void 0, function* () {
                const key = store.key([kind, id]);
                const [entity] = yield retry(() => store.get(key));
                if (!entity)
                    throw { message: "entity not found", status: 404 };
                const _id = getId(entity);
                const entityWithId = Object.assign(Object.assign({}, entity), { _id });
                validate === null || validate === void 0 ? void 0 : validate(entityWithId);
                return entityWithId;
            });
        }
        function query(options, validate) {
            var _a, _b;
            return __awaiter(this, void 0, void 0, function* () {
                const query = store.createQuery(kind);
                //filters
                (_a = options === null || options === void 0 ? void 0 : options.filters) === null || _a === void 0 ? void 0 : _a.forEach(([field, operator, value]) => {
                    query.filter(field, operator, value);
                });
                //orders
                (_b = options === null || options === void 0 ? void 0 : options.orders) === null || _b === void 0 ? void 0 : _b.forEach(({ field, descending }) => {
                    query.order(field, { descending });
                });
                //limit
                if (options === null || options === void 0 ? void 0 : options.limit)
                    query.limit(options.limit);
                //select
                if (options === null || options === void 0 ? void 0 : options.select)
                    query.select(options.select);
                const [entities] = yield retry(() => store.runQuery(query));
                const entitiesWithIds = entities.map(entity => (Object.assign(Object.assign({}, entity), { _id: getId(entity) })));
                validate === null || validate === void 0 ? void 0 : validate(entitiesWithIds);
                return entitiesWithIds;
            });
        }
        function update(id, update, validate) {
            return __awaiter(this, void 0, void 0, function* () {
                //TODO should we proactively strip the id
                const key = store.key([kind, id]);
                const entity = yield retry(() => get(id));
                if (!entity)
                    throw "entity not found";
                validate === null || validate === void 0 ? void 0 : validate(entity);
                const { _id } = entity, data = __rest(entity, ["_id"]);
                yield retry(() => store.save({
                    key,
                    data: Object.assign(Object.assign({}, data), update),
                }));
                return Object.assign(Object.assign(Object.assign({}, data), update), { _id: id });
            });
        }
        function destroy(id, validate) {
            return __awaiter(this, void 0, void 0, function* () {
                const key = store.key([kind, id]);
                const entity = yield retry(() => get(id));
                if (!entity)
                    throw "entity not found";
                validate === null || validate === void 0 ? void 0 : validate(entity);
                yield retry(() => store.delete(key));
                return { message: "delete successful" };
            });
        }
        function transaction(func) {
            return __awaiter(this, void 0, void 0, function* () {
                const transaction = store.transaction();
                function create(data, id, validate) {
                    const key = id ? store.key([kind, id]) : store.key(kind);
                    validate === null || validate === void 0 ? void 0 : validate(data);
                    return transaction.save({
                        key,
                        data,
                    });
                }
                function get(id, validate) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const key = store.key([kind, id]);
                        const [entity] = yield transaction.get(key);
                        if (!entity)
                            throw "entity not found";
                        const _id = getId(entity);
                        const entityWithId = Object.assign(Object.assign({}, entity), { _id });
                        validate === null || validate === void 0 ? void 0 : validate(entityWithId);
                        return entityWithId;
                    });
                }
                function query(options, validate) {
                    var _a, _b;
                    return __awaiter(this, void 0, void 0, function* () {
                        const query = transaction.createQuery(kind);
                        //filters
                        (_a = options === null || options === void 0 ? void 0 : options.filters) === null || _a === void 0 ? void 0 : _a.forEach(([field, operator, value]) => {
                            query.filter(field, operator, value);
                        });
                        //orders
                        (_b = options === null || options === void 0 ? void 0 : options.orders) === null || _b === void 0 ? void 0 : _b.forEach(({ field, descending }) => {
                            query.order(field, { descending });
                        });
                        //limit
                        if (options === null || options === void 0 ? void 0 : options.limit)
                            query.limit(options === null || options === void 0 ? void 0 : options.limit);
                        //select
                        if (options === null || options === void 0 ? void 0 : options.select)
                            query.select(options.select);
                        const [entities] = yield transaction.runQuery(query);
                        const entitiesWithIds = entities.map(entity => (Object.assign(Object.assign({}, entity), { id: getId(entity) })));
                        validate === null || validate === void 0 ? void 0 : validate(entitiesWithIds);
                        return entitiesWithIds;
                    });
                }
                function update(id, update, validate) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const key = store.key([kind, id]);
                        const entity = yield get(id);
                        if (!entity)
                            throw "entity not found";
                        validate === null || validate === void 0 ? void 0 : validate(entity);
                        const { _id } = entity, data = __rest(entity, ["_id"]);
                        return transaction.save({
                            key,
                            data: Object.assign(Object.assign({}, data), update),
                        });
                    });
                }
                function destroy(id, validate) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const key = store.key([kind, id]);
                        const entity = yield get(id);
                        if (!entity)
                            throw "entity not found";
                        validate === null || validate === void 0 ? void 0 : validate(entity);
                        return transaction.delete(key);
                    });
                }
                retry(() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        yield transaction.run();
                        func({ transaction, create, get, query, update, destroy });
                        yield transaction.commit();
                    }
                    catch (error) {
                        yield transaction.rollback();
                        throw error;
                    }
                }));
                return;
            });
        }
        return { create, get, query, update, transaction, destroy };
    }
    return {
        createModel,
    };
}
exports.default = createORM;
