import { app } from './api.ts';

// 定义 Cloudflare Workers 所需的类型
interface Env {
  ENVIRONMENT?: string;
  PORT?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// 导出默认的 fetch 函数，这是 Workers 的入口点
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      // 设置环境变量
      if (env.ENVIRONMENT) {
        Deno.env.set('ENVIRONMENT', env.ENVIRONMENT);
      }
      if (env.PORT) {
        Deno.env.set('PORT', env.PORT);
      }

      // 处理请求
      const response = await app.handle(request);
      if (!response) {
        return new Response('Not Found', { status: 404 });
      }
      return response;
    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(
        JSON.stringify({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
          }
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }
}