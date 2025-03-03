# Edge TTS Deno

Edge TTS Deno 是 Microsoft Edge 在线文本转语音(TTS)服务的Deno实现版本，支持边缘函数部署。这是一个从Python版 [edge-tts](https://github.com/rany2/edge-tts) 移植的项目，感谢**rany2**提供的灵感。

## TODO

- 🚧 完善字幕生成逻辑，提高准确性和稳定性。
- 🚧 开发独立的字幕生成 API。
- 🚧 解决 Cloudflare Workers 适配问题 (目前受阻于 `npm:ws` 的 stream)。

## 特性

- 使用 Deno 原生 WebSocket
- 支持实时音频流
- 支持多语言和多种语音
- 支持边缘函数部署
- 兼容 OpenAI API 格式
- 完整的类型支持
- 灵活的 HTML 标签处理 (可选择保留或去除文本中的 HTML 标签)

## API 文档

### 认证配置

API 使用 Bearer Token 认证机制。你需要在请求头中包含 `Authorization` 头部：
```
Authorization: Bearer <your-api-key>
```

API密钥可以通过以下方式配置：
1. 环境变量：设置 `API_KEY` 环境变量
2. 默认值：如果未设置环境变量，将使用默认值 `edge-tts-deno-default-key-2024`

完整的 API 文档请查看 [API 参考文档](./docs/api-reference.md)。

## 安装

由于这是一个Deno项目，你不需要安装任何包。只需要在你的代码中直接导入即可：

```typescript
import { WebSocketClient } from "https://raw.githubusercontent.com/AioFul/edge-tts-deno/main/mod.ts";
```

## 命令行使用

### 基本命令

```bash
# 直接转换文本
deno run --allow-net mod.ts --text "你好，世界！"

# 从文件读取文本
deno run --allow-net --allow-read mod.ts --file input.txt

# 列出可用语音
deno run --allow-net mod.ts --list-voices
```

### 参数说明

```bash
选项：
  -t, --text           要转换的文本内容
  -f, --file          输入文件路径（使用 "-" 表示从标准输入读取）
  -v, --voice         语音选择 (默认: "zh-CN-XiaoxiaoNeural")
  -l, --list-voices   列出可用的语音
  --rate              语速控制 (默认: "+0%")
  --volume            音量控制 (默认: "+0%")
  --pitch             音调控制 (默认: "+0Hz")
  --words-in-cue      字幕分组词数 (默认: 10)
  --write-media       音频输出文件路径
  --write-subtitles   字幕输出文件路径
  --proxy             代理服务器设置 (未实现)
```

### 使用示例

```bash
# 基本用法 - 将文本转换为语音并输出到终端
deno run --allow-net mod.ts -t "你好，世界！"

# 保存到文件 - 将语音保存为MP3文件
deno run --allow-net --allow-write mod.ts \
  --text "你好，世界！" \
  --write-media output.mp3

# 生成字幕 - 同时生成音频和字幕文件
deno run --allow-net --allow-write mod.ts \
  --text "你好，世界！" \
  --write-media output.mp3 \
  --write-subtitles output.srt

# 调整语音参数
deno run --allow-net mod.ts \
  --text "你好，世界！" \
  --voice "zh-CN-XiaoxiaoNeural" \
  --rate "+10%" \
  --volume "+20%" \
  --pitch "+0Hz"

# 从文件读取长文本
deno run --allow-net --allow-read --allow-write mod.ts \
  --file input.txt \
  --write-media output.mp3 \
  --write-subtitles output.srt

# 使用代理服务器
deno run --allow-net mod.ts \
  --text "你好，世界！" \
  # --proxy "http://proxy.example.com:8080"
```

### 注意事项

1. 权限说明
   - `--allow-net`: 必需，用于网络访问
   - `--allow-read`: 当从文件读取文本时需要
   - `--allow-write`: 当输出到文件时需要

2. 输出控制
   - 默认情况下，音频数据会输出到终端
   - 使用 `--write-media` 将音频保存到文件
   - 使用 `--write-subtitles` 生成字幕文件

3. 字幕生成
   - 字幕以SRT格式生成
   - `--words-in-cue` 控制每个字幕片段包含的词数
   - 时间戳自动同步

4. 错误处理
   - 命令执行失败时会显示错误信息
   - 使用代理时如果连接失败会提供相关错误信息

## 基础用法

### 简单示例

```typescript
import { WebSocketClient } from "./mod.ts";

const client = new WebSocketClient(
  "你好，世界！",
  "zh-CN-XiaoxiaoNeural" // 使用中文语音
);

// 将音频保存到文件
const audioChunks: Uint8Array[] = [];
for await (const chunk of client.stream()) {
  if (chunk.type === "audio") {
    audioChunks.push(chunk.data);
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

await Deno.writeFile("output.mp3", finalAudio);
```

### 自定义配置

```typescript
const client = new WebSocketClient(
  "Hello, world!",
  "en-US-AriaNeural",
  "+10%",   // 语速
  "+0%",    // 音量
  "+0Hz",   // 音调
  {
    connectTimeout: 5000,    // 连接超时时间
    receiveTimeout: 30000,   // 接收超时时间
  }
);
```

## 部署到 Deno Deploy

### 一键部署

[![Deploy to Deno Deploy](https://deno.com/favicon.ico)](https://dash.deno.com/projects?template=https://github.com/AioFul/edge-tts-deno)

### 手动部署

1. 安装 deployctl CLI (如果尚未安装):
```bash
deno install -gArf jsr:@deno/deployctl
```

2. 部署到 Deno Deploy:
```bash
deployctl deploy --include="**/*.ts" --include="*.json" --entrypoint=mod.ts
```

### 环境变量配置

在 Deno Deploy 项目设置中配置以下环境变量（可选）：

- `API_KEY`: API 密钥 (推荐使用环境变量配置)

### 注意事项

1. 确保你已创建 Deno Deploy 项目
2. 部署后，你的 API 将可以通过 Deno Deploy 分配的 URL 访问，例如： `https://your-project-name.deno.dev`

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request。在提交 PR 之前，请确保：

1. 代码通过 `deno fmt` 格式化
2. 通过 `deno lint` 检查
3. 添加适当的测试
4. 更新相关文档