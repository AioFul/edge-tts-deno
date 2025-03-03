/**
 * Edge TTS Deno - Microsoft Edge TTS服务的Deno实现
 */

// 核心功能导出
export { WebSocketClient } from "@src/core/websocket_client.ts";
export { getVoices, type Voice, classifyVoices, formatVoiceInfo } from "@src/core/voices.ts";

// 类型定义导出
export type {
  TTSConfig,
  TTSChunk,
  WordBoundary,
  AudioChunk,
} from "@src/types/config.ts";

// CLI相关导出
export {
  EdgeTTSCliProcessor,
  main as cliMain,
} from "@src/cli/mod.ts";
export type {
  CLIArgs,
  CLIProcessor,
  InputSource,
  OutputTarget,
  CLIError,
} from "@src/types/cli.ts";

// 字幕相关导出
export { SubtitleGeneratorFactory } from "@src/utils/subtitle.ts";
export type {
  SubtitleConfig,
  SubtitleCue,
  SubtitleTimestamp,
  SubtitleGenerator,
} from "@src/types/subtitle.ts";

// 常量导出
export {
  DEFAULT_VOICE,
  AUDIO_FORMATS,
  type AudioFormat,
  DEFAULT_API_KEY,
} from "@src/constants.ts";

// 错误类型导出
export {
  TTSError,
  WebSocketError,
  NoAudioReceived,
  UnexpectedResponse,
  UnknownResponse,
  ConfigError,
  DRMError,
} from "@src/errors/tts_error.ts";

// 工具函数导出
export {
  SSMLGenerator,
} from "@src/utils/ssml.ts";

// 版本信息
export const VERSION = "0.1.0";

// 导入 API 模块
import { app } from "./api.ts";

// CLI运行入口
if (import.meta.main) {
  // 启动 CLI
  if (Deno.args.length > 0) {
    const { main } = await import("@src/cli/main.ts");
    await main().catch((error: unknown) => {
      console.error("Fatal error:", error);
      Deno.exit(1);
    });
  } else {
    // 启动 HTTP 服务
    const port = Number(Deno.env.get('PORT')) || 3000; // 可以从环境变量中读取
    console.log(`HTTP server listening on http://localhost:${port}`);
    await app.listen({ port });
  }
}