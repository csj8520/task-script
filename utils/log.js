"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Log {
    logs = [];
    constructor() { }
    log(...args) {
        this.logs.push(...args);
        console.log(...args);
    }
}
exports.default = Log;
