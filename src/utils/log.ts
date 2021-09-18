export default class Log {
  public logs: any[] = [];
  constructor() {}
  log(...args: any[]) {
    this.logs.push(...args);
    console.log(...args);
  }
}
