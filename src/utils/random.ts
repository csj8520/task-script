export default function random(x: number, y: number): number;
export default function random(str: string, length: number, repeat?: boolean): string;
export default function random(str: string): string;
export default function random<T>(arr: T[], length: number, repeat?: boolean): T[];
export default function random<T>(arr: T[]): T;
export default function random(x: any, y?: any, repeat = true) {
  if (typeof x === 'number') {
    return Math.floor(Math.random() * (y - x + 1)) + x;
  } else if (typeof x === 'string') {
    if (y === void 0) {
      return random(x.split(''));
    }
    return random(x.split(''), y, repeat).join('');
  } else if (x instanceof Array) {
    if (y === void 0) {
      return x[random(0, x.length - 1)];
    }
    if (!repeat && y > x.length) window.console.warn('"length" cannot be greater than "arr.length"'), (repeat = true);
    const o = [...x];
    const arr: any[] = [];
    for (let i = 0; i < y; i++) {
      const index = random(0, o.length - 1);
      arr.push(o[index]);
      if (!repeat) o.splice(index, 1);
    }
    return arr;
  } else {
    throw new Error('Type Error');
  }
}
