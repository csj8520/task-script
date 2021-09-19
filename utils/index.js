"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = exports.cdn = exports.importModule = exports.random = exports.Log = void 0;
var log_1 = require("./log");
Object.defineProperty(exports, "Log", { enumerable: true, get: function () { return __importDefault(log_1).default; } });
var random_1 = require("./random");
Object.defineProperty(exports, "random", { enumerable: true, get: function () { return __importDefault(random_1).default; } });
var import_module_1 = require("./import-module");
Object.defineProperty(exports, "importModule", { enumerable: true, get: function () { return __importDefault(import_module_1).default; } });
function cdn(url) {
    return url.replace(/https:\/\/raw.githubusercontent.com\/(.*?)\/(.*?)\/(.*)/gim, 'https://cdn.jsdelivr.net/gh/$1/$2@$3');
}
exports.cdn = cdn;
const delay = (t) => new Promise(res => setTimeout(res, t));
exports.delay = delay;
