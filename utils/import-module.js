"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const got_1 = require("got");
async function importModule(...urls) {
    for (const it of urls) {
        let error = false;
        try {
            if (/^http(s)?:\/\//.test(it)) {
                const notify = await got_1.default.get(it);
                return eval(notify.body);
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
