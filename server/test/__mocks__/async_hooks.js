class AsyncLocalStorage {
  constructor() {
    this.store = undefined;
  }

  getStore() {
    return this.store;
  }

  run(store, callback, ...args) {
    const previousStore = this.store;
    this.store = store;
    try {
      return callback(...args);
    } finally {
      this.store = previousStore;
    }
  }

  exit(callback, ...args) {
    const previousStore = this.store;
    this.store = undefined;
    try {
      return callback(...args);
    } finally {
      this.store = previousStore;
    }
  }

  enterWith(store) {
    this.store = store;
  }

  disable() {
    this.store = undefined;
  }
}

module.exports = { AsyncLocalStorage };
