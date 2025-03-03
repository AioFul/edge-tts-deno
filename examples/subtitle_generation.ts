/**
 * 字幕生成示例
 * 展示SRT格式字幕生成功能
 */
import {
  WebSocketClient,
  type TTSChunk,
} from "../mod.ts";

// 准备文本进行转换
const text = `
这是一个演示字幕生成功能的示例。
我们使用Edge TTS服务将文本转换为语音，
同时生成同步的SRT格式字幕文件。
让我们看看效果如何。
`.trim();

/**
 * 清除当前行
 */
function clearLine() {
  // 将光标移到行首并清除该行
  Deno.stdout.writeSync(new TextEncoder().encode("\r[K"));
}

/**
 * 显示进度
 */
function showProgress(text: string) {
  clearLine();
  Deno.stdout.writeSync(new TextEncoder().encode(`处理中: ${text}`));
}

async function generateSubtitles() {
  console.log("开始生成字幕...");

  const client = new WebSocketClient(
    text,
    "zh-CN-XiaoxiaoNeural",
    "+0%",
    "+0%",
    "+0Hz",
    {
      subtitle: {
        wordsPerCue: 10,
      },
    }
  );

  try {
    // 处理音频和字幕
    const audioChunks: Uint8Array[] = [];
    for await (const chunk of client.stream()) {
      if (chunk.type === "audio") {
        audioChunks.push(chunk.data);
      } else if (chunk.type === "WordBoundary") {
        // 显示生成进度
        showProgress(chunk.text);
      }
    }

    // 清除进度显示
    clearLine();

    // 获取字幕内容
    const subtitles = client.getSubtitles();
    await Deno.writeTextFile("output.srt", subtitles);
    console.log(`字幕已保存至 output.srt`);

    // 保存音频
    const audio = new Uint8Array(
      audioChunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of audioChunks) {
      audio.set(chunk, offset);
      offset += chunk.length;
    }
    await Deno.writeFile("output.mp3", audio);
    console.log("音频已保存至 output.mp3");
  } catch (error) {
    console.error("生成字幕时出错:", error);
  }

  console.log("\n字幕生成完成！");
  console.log("生成的文件:");
  console.log("- output.srt (SRT格式字幕)");
  console.log("- output.mp3 (音频文件)");
}

// 运行示例
if (import.meta.main) {
  generateSubtitles().catch(console.error);
}