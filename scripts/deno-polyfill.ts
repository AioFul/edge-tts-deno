// Polyfill for Deno namespace in Cloudflare Workers
interface DenoEnv {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  toObject(): { [key: string]: string };
  delete(key: string): void;
  hasTool(tool: string): boolean;
}

interface DenoNamespace {
  env: DenoEnv;
}

// 创建一个内存环境变量存储
const envStore = new Map<string, string>();

// 实现 Deno polyfill
if (typeof globalThis.Deno === 'undefined') {
  (globalThis as any).Deno = {
    env: {
      get: (key: string): string | undefined => {
        return envStore.get(key);
      },
      set: (key: string, value: string): void => {
        envStore.set(key, value);
      },
      toObject: (): { [key: string]: string } => {
        const obj: { [key: string]: string } = {};
        envStore.forEach((value, key) => {
          obj[key] = value;
        });
        return obj;
      },
      delete: (key: string): void => {
        envStore.delete(key);
      },
      hasTool: (tool: string): boolean => {
        return false; // 在 Cloudflare Workers 环境中，我们不支持 Deno tools
      },
    },
  };
}

export {};