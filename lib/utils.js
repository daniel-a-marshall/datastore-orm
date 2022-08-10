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
Object.defineProperty(exports, "__esModule", { value: true });
exports.callWithRetry = exports.wait = void 0;
function wait(ms = 1000) {
    return new Promise(res => setTimeout(res, ms));
}
exports.wait = wait;
//TODO in the future add a way to escape the retries based on certian response types like 400 or 403
const retryDefaults = {
    retries: 3,
    backoff: 100,
};
function callWithRetry(fn, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const retries = (options === null || options === void 0 ? void 0 : options.retries) || 3;
        const backoff = (options === null || options === void 0 ? void 0 : options.backoff) || 100;
        try {
            return yield fn();
        }
        catch (error) {
            if (retries === 1)
                throw error;
            if ((_a = options === null || options === void 0 ? void 0 : options.escape) === null || _a === void 0 ? void 0 : _a.call(options, error))
                throw error;
            yield wait(backoff);
            return callWithRetry(fn, Object.assign(Object.assign({}, options), { retries: retries - 1, backoff: backoff * 2 }));
        }
    });
}
exports.callWithRetry = callWithRetry;
