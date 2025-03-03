// Storage polyfill for Cloudflare Workers
declare global {
  var localStorage: Storage;
}

// 使用内存存储作为临时替代
const memoryStorage = new Map<string, string>();

class WorkerStorage implements Storage {
  private store = memoryStorage;

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

// 创建全局 localStorage
globalThis.localStorage = new WorkerStorage();

export {};