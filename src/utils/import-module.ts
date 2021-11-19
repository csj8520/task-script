import got from 'got';
import vm from 'node:vm';

export default async function importModule(...urls: string[]) {
  for (const it of urls) {
    let error = false;
    try {
      if (/^http(s)?:\/\//.test(it)) {
        const notify = await got.get(it);
        const _module = { ...module, exports: {} };
        const func = vm.runInThisContext(`(function(exports, require, module, __filename, __dirname){${notify.body}})`);
        func.call(_module.exports, _module.exports, require, _module, __filename, __dirname);
        return _module.exports;
        // return eval(notify.body);
      } else {
        return require(it);
      }
    } catch (e) {
      error = true;
      console.log(`importModule Error "${it}"`);
    } finally {
      error || console.log(`importModule Success "${it}"`);
    }
  }
}
