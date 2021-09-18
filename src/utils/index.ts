export { default as Log } from './log';
export { default as random } from './random';
export { default as importModule } from './import-module';

export function cdn(url: string) {
  return url.replace(/https:\/\/raw.githubusercontent.com\/(.*?)\/(.*?)\/(.*)/gim, 'https://cdn.jsdelivr.net/gh/$1/$2@$3');
}

export const delay = (t: number) => new Promise(res => setTimeout(res, t));
