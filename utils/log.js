"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Log {
    logs = [];
    constructor() { }
    log(...args) {
        this.logs.push(...args);
        console.log(...args);
    }
    table(table, padding = 2) {
        const horizontalWidth = Math.max(...table.map(it => it.length));
        const strings = new Array(table.length).fill('');
        for (let i = 0; i < horizontalWidth; i++) {
            const width = Math.max(...table.map(it => this.cacleStrWidth(it[i] || ''))) + padding;
            table.forEach((it, col) => {
                if (it.length > i) {
                    strings[col] += it[i];
                }
                if (it.length - 1 > i) {
                    strings[col] += ' '.repeat(width - this.cacleStrWidth(it[i]));
                }
            });
        }
        this.log(strings.join('\n'));
    }
    cacleStrWidth(str) {
        //           中文             韩文                         日文             中文标点
        const reg = /[\u4e00-\u9fa5]|[\u3130-\u318F\uAC00-\uD7A3]|[\u0800-\u4e00]|[\u3000-\u301e\ufe10-\ufe19\ufe30-\ufe44\ufe50-\ufe6b\uff01-\uffee]/;
        return str.split('').reduce((sum, it) => sum + (reg.test(it) ? 2 : 1), 0);
    }
}
exports.default = Log;
