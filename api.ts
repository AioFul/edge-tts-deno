// api.ts
import { Application, Router, RouterContext, Context } from "@oak";
import {
  DEFAULT_VOICE,
  WebSocketClient,
  SSMLGenerator,
  DEFAULT_API_KEY
} from "./mod.ts";
import { getVoices, type Voice } from "./mod.ts"; // 导入 getVoices, Voice
import {
  TTSError,
  ConfigError,
  NoAudioReceived,
  WebSocketError
} from "./mod.ts";

// 自定义认证错误
class AuthError extends TTSError {
  constructor(message: string) {
    super(message, "UNAUTHORIZED", 401);
  }
}

// 认证中间件
async function authMiddleware(context: Context, next: () => Promise<unknown>) {
  const apiKey = Deno.env.get("API_KEY") || DEFAULT_API_KEY;
  const authHeader = context.request.headers.get("Authorization");
  
  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    throw new AuthError("Invalid or missing API key");
  }
  
  await next();
}

// CORS中间件
async function corsMiddleware(context: Context, next: () => Promise<unknown>) {
  context.response.headers.set("Access-Control-Allow-Origin", "*");
  context.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  context.response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  context.response.headers.set("Access-Control-Max-Age", "86400");

  if (context.request.method === "OPTIONS") {
    context.response.status = 204; // No content
    return;
  }

  await next();
}

const router = new Router();

// 语音列表接口
router.get("/v1/audio/voices", async (context: RouterContext<string, {}>) => {
  try {
    const voices = await getVoices();
    const voiceMap = voices.reduce((acc, voice) => {
      acc[voice.ShortName] = voice;
      return acc;
    }, {} as { [key: string]: Voice });
    context.response.body = {
      data: voiceMap,
    };
  } catch (error) {
    if (error instanceof TTSError) {
      context.response.status = error.status;
      context.response.body = {
        error: {
          code: error.code,
          message: error.message
        }
      };
    } else {
      console.error("Error fetching voices:", error);
      context.response.status = 500;
      context.response.body = {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch voices"
        }
      };
    }
  }
});

// 语音合成接口
router.post("/v1/audio/speech", async (context: RouterContext<string, {}>) => {
  try {
    const body = await context.request.body({ type: "json" }).value;
    const input = body as {
      input: string;
      model: string;
      voice: string;
      response_format: string;
      rate?: string;
      volume?: string;
      pitch?: string;
      allowHtml?: boolean;
    };

    if (!input.input) {
      throw new ConfigError("Missing required parameter: 'input'");
    }

    if (input.response_format && !["url", "mp3"].includes(input.response_format)) {
      throw new ConfigError("Invalid 'response_format' parameter. Must be 'url' or 'mp3'");
    }

    let text = input.input;
    // 默认不允许HTML标签
    if (!input.allowHtml) {
      text = SSMLGenerator.removeHtmlTags(text);
    }
    const voice = input.voice || DEFAULT_VOICE;
    const rate = input.rate || "+0%";
    const volume = input.volume || "+0%";
    const pitch = input.pitch || "+0Hz";
    const response_format = input.response_format || "mp3";

    const client = new WebSocketClient(text, voice, rate, volume, pitch);
    const audioChunks: Uint8Array[] = [];

    try {
      for await (const chunk of client.stream()) {
        if (chunk.type === "audio") {
          audioChunks.push(chunk.data);
        }
      }
    } catch (error) {
      if (error instanceof NoAudioReceived) {
        throw error; // 重新抛出,由外层统一处理
      } else if (error instanceof WebSocketError) {
        throw error;
      } else if (error instanceof TTSError) {
        throw error;
      } else {
        console.error("Error during speech generation:", error);
        throw new TTSError("Failed to generate speech", "SPEECH_GENERATION_ERROR");
      }
    }

    const finalAudio = new Uint8Array(
      audioChunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of audioChunks) {
      finalAudio.set(chunk, offset);
      offset += chunk.length;
    }

    // 根据 response_format 返回不同的结果
    if (response_format === "url") {
      // 模拟生成一个 URL
      const audioUrl = "https://example.com/audio.mp3"; // 替换为实际的 URL 生成逻辑
      context.response.body = {
        url: audioUrl,
      };
    } else if (response_format === "mp3") {
      context.response.headers.set("Content-Type", "audio/mpeg");
      context.response.body = finalAudio;
    } else {
      context.response.status = 400;
      context.response.body = {
        error: "Invalid 'response_format' parameter.  Must be 'url' or 'mp3'.",
      };
    }
  } catch (error) {
    if (error instanceof TTSError) {
      context.response.status = error.status;
      context.response.body = {
        error: {
          code: error.code,
          message: error.message
        }
      };
    } else {
      console.error("Unexpected error:", error);
      context.response.status = 500;
      context.response.body = {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred"
        }
      };
    }
  }
});

// 统一错误处理中间件
async function errorHandler(context: Context, next: () => Promise<unknown>) {
  try {
    await next();
  } catch (error) {
    if (error instanceof TTSError) {
      context.response.status = error.status;
      context.response.body = {
        error: {
          code: error.code,
          message: error.message
        }
      };
    } else {
      console.error("Unexpected error:", error);
      context.response.status = 500;
      context.response.body = {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred"
        }
      };
    }
  }
}

const app = new Application();

// 注册错误处理中间件
app.use(errorHandler);

// 注册CORS中间件
app.use(corsMiddleware);

// 注册认证中间件
app.use(authMiddleware);

// 注册路由中间件
app.use(router.routes());
app.use(router.allowedMethods());

export { app };