# Edge TTS Deno API 参考文档

## 认证

所有API请求都需要通过Bearer Token认证。在请求头中添加`Authorization`头：

```
Authorization: Bearer <your-api-key>
```

API密钥可以通过以下方式配置：
1. 环境变量：设置 `API_KEY` 环境变量
2. 默认值：如果未设置环境变量，将使用默认值 `edge-tts-deno-default-key-2024`

### CORS

API支持跨域请求（CORS），允许来自任何源的请求。支持以下HTTP方法：
- GET
- POST
- OPTIONS（预检请求）

允许的请求头：
- Authorization
- Content-Type

## 语音合成 API

### POST /v1/audio/speech

将文本转换为语音。

#### 请求

```json
{
  "input": string,            // 需要转换的文本内容（必需）
  "model": string,           // 模型名称（可选）
  "voice": string,           // 语音名称（可选，默认：zh-CN-XiaoxiaoNeural）
  "response_format": string, // 响应格式（可选，"mp3" 或 "url"，默认："mp3"）
  "rate": string,           // 语速（可选，如 "+0%"，默认："+0%"）
  "volume": string,         // 音量（可选，如 "+0%"，默认："+0%"）
  "pitch": string,          // 音调（可选，如 "+0Hz"，默认："+0Hz"）
  "allowHtml": boolean      // 是否保留 HTML 标签（可选，默认：false）
}
```

##### 参数说明

- `input`（必需）：要转换为语音的文本内容。
- `model`（可选）：使用的模型名称。
- `voice`（可选）：使用的语音名称，默认为 "zh-CN-XiaoxiaoNeural"。
- `response_format`（可选）：响应格式，可选值为 "mp3" 或 "url"，默认为 "mp3"。
- `rate`（可选）：语速控制，如 "+10%"、"-10%"，默认为 "+0%"。
- `volume`（可选）：音量控制，如 "+10%"、"-10%"，默认为 "+0%"。
- `pitch`（可选）：音调控制，如 "+10Hz"、"-10Hz"，默认为 "+0Hz"。
- `allowHtml`（可选）：是否保留文本中的 HTML 标签，默认为 false。
  - 当为 false 时，会去除所有 HTML 标签，如 "<think>你好</think>世界" 会变成 "你好世界"
  - 当为 true 时，会保留 HTML 标签，文本会原样传递给语音合成引擎

#### 响应

当 `response_format` 为 "mp3" 时：
- Content-Type: audio/mpeg
- Body: 音频二进制数据

当 `response_format` 为 "url" 时：
```json
{
  "url": string  // 音频文件的 URL
}
```

#### 错误响应

```json
{
  "error": {
    "code": string,    // 错误代码
    "message": string  // 错误信息
  }
}
```

#### 示例

##### 请求示例 1（默认去除 HTML 标签）：
```json
{
  "input": "<think>你好</think>世界",
  "voice": "zh-CN-XiaoxiaoNeural"
}
```

实际处理的文本：`你好世界`

##### 请求示例 2（保留 HTML 标签）：
```json
{
  "input": "<think>你好</think>世界",
  "voice": "zh-CN-XiaoxiaoNeural",
  "allowHtml": true
}
```

实际处理的文本：`<think>你好</think>世界`

### GET /v1/audio/voices

获取可用的语音列表。

#### 请求

无需请求参数。

#### 响应

```json
{
  "data": {
    [voiceId: string]: {
      "Name": string,
      "ShortName": string,
      "Gender": string,
      "Locale": string,
      "SuggestedCodec": string,
      "FriendlyName": string,
      "Status": string
    }
  }
}
```

#### 错误响应

```json
{
  "error": {
    "code": string,    // 错误代码
    "message": string  // 错误信息
  }
}