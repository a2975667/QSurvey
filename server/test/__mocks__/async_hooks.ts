export class AsyncLocalStorage<T = unknown> {
  private store: T | undefined;

  getStore(): T | undefined {
    return this.store;
  }

  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
    const previousStore = this.store;
    this.store = store;
    try {
      return callback(...args);
    } finally {
      this.store = previousStore;
    }
  }

  exit<R>(callback: (...args: any[]) => R, ...args: any[]): R {
    const previousStore = this.store;
    this.store = undefined;
    try {
      return callback(...args);
    } finally {
      this.store = previousStore;
    }
  }

  enterWith(store: T): void {
    this.store = store;
  }

  disable(): void {
    this.store = undefined;
  }
}
