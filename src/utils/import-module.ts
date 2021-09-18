import got from 'got';
export default async function importModule(...urls: string[]) {
  for (const it of urls) {
    let error = false;
    try {
      if (/^http(s)?:\/\//.test(it)) {
        const notify = await got.get(it);
        return eval(notify.body);
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
