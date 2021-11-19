"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const got_1 = (0, tslib_1.__importDefault)(require("got"));
const node_vm_1 = (0, tslib_1.__importDefault)(require("node:vm"));
async function importModule(...urls) {
    for (const it of urls) {
        let error = false;
        try {
            if (/^http(s)?:\/\//.test(it)) {
                const notify = await got_1.default.get(it);
                const _module = { ...module, exports: {} };
                const func = node_vm_1.default.runInThisContext(`(function(exports, require, module, __filename, __dirname){${notify.body}})`);
                func.call(_module.exports, _module.exports, require, _module, __filename, __dirname);
                return _module.exports;
                // return eval(notify.body);
            }
            else {
                return require(it);
            }
        }
        catch (e) {
            error = true;
            console.log(`importModule Error "${it}"`);
        }
        finally {
            error || console.log(`importModule Success "${it}"`);
        }
    }
}
exports.default = importModule;
