import {
  type SubtitleCue,
  type SubtitleTimestamp,
  type SubtitleConfig,
  type WordBoundaryMessage,
  type SubtitleGenerator,
  DEFAULT_SUBTITLE_CONFIG,
} from "../types/subtitle.ts";

/**
 * 将微秒转换为 SRT 格式的时间戳字符串
 */
function formatSRTTimestamp(microseconds: number): string {
  const totalMilliseconds = Math.floor(microseconds / 1000);
  const hours = Math.floor(totalMilliseconds / 3600000);
  const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
  const seconds = Math.floor((totalMilliseconds % 60000) / 1000);
  const milliseconds = totalMilliseconds % 1000;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")
    }:${seconds.toString().padStart(2, "0")},${milliseconds.toString().padStart(3, "0")
    }`;
}

/**
 * 计算文本中的词数（支持中英文混排）
 */
function countWords(text: string): number {
  // 将中文字符视为独立的词
  const normalized = text.replace(/[\u4e00-\u9fa5]/g, " $& ");
  // 按空白字符分割并过滤空字符串
  return normalized.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * 标准化文本（处理空格和标点）
 */
function normalizeText(text: string): string {
  // 1. 处理中英文之间的空格
  let normalized = text
    .replace(/([A-Za-z])([\u4e00-\u9fa5])/g, "$1 $2")
    .replace(/([\u4e00-\u9fa5])([A-Za-z])/g, "$1 $2");

  // 2. 将多个空格压缩为单个空格
  normalized = normalized.replace(/\s+/g, " ");

  // 3. 修复标点符号周围的空格
  normalized = normalized
    .replace(/ ([,.!?，。！？、])/g, "$1")
    .replace(/([,.!?，。！？、]) /g, "$1");

  return normalized.trim();
}

/**
 * SRT字幕生成器
 */
export class SRTGenerator implements SubtitleGenerator {
  private cues: SubtitleCue[] = [];
  private readonly config: Required<SubtitleConfig>;
  private currentIndex = 1;

  constructor(config: Partial<SubtitleConfig> = {}) {
    this.config = {
      ...DEFAULT_SUBTITLE_CONFIG,
      ...config,
    };
  }

  /**
   * 添加字幕片段
   */
  public addCue(msg: WordBoundaryMessage): void {
    if (msg.type !== "WordBoundary") {
      throw new Error("Invalid message type, expected 'WordBoundary'");
    }

    // 将输入的时间单位（100纳秒）转换为微秒
    const startMicros = Math.floor(msg.offset / 10);
    const durationMicros = Math.floor(msg.duration / 10);
    const endMicros = startMicros + durationMicros;

    this.cues.push({
      index: this.currentIndex++,
      timestamp: {
        start: startMicros,
        duration: durationMicros,
        end: endMicros,
      },
      text: normalizeText(msg.text),
    });
  }

  /**
   * 获取所有字幕片段
   */
  public getCues(): SubtitleCue[] {
    return [...this.cues];
  }

  /**
   * 合并字幕片段
   */
  public mergeCues(words: number): void {
    if (words <= 0) {
      throw new Error("Invalid number of words to merge, expected > 0");
    }

    if (this.cues.length === 0) {
      return;
    }

    // 按时间排序
    this.cues.sort((a, b) => a.timestamp.start - b.timestamp.start);

    const newCues: SubtitleCue[] = [];
    let currentCue = this.cues[0];
    let currentWords = countWords(currentCue.text);

    for (const cue of this.cues.slice(1)) {
      const nextWords = countWords(cue.text);

      // 只有当合并后的总词数超过限制时才不合并
      if (currentWords + nextWords > words) {
        newCues.push(currentCue);
        currentCue = cue;
        currentWords = nextWords;
      } else {
        // 更新时间戳
        currentCue = {
          index: currentCue.index,
          timestamp: {
            start: currentCue.timestamp.start,
            end: cue.timestamp.end,
            duration: cue.timestamp.end - currentCue.timestamp.start,
          },
          text: normalizeText(`${currentCue.text}${cue.text}`),
        };
        currentWords += nextWords;
      }
    }
    newCues.push(currentCue);

    // 重新编号并更新
    this.cues = newCues.map((cue, index) => ({
      ...cue,
      index: index + 1,
    }));
    this.currentIndex = this.cues.length + 1;
  }

  /**
   * 格式化时间戳
   */
  private formatTimestamp(timestamp: SubtitleTimestamp): string {
    return `${formatSRTTimestamp(timestamp.start)} --> ${formatSRTTimestamp(timestamp.end)}`;
  }

  /**
   * 生成SRT格式的字幕
   */
  public generate(): string {
    // 确保字幕按时间排序
    this.cues.sort((a, b) => a.timestamp.start - b.timestamp.start);

    return this.cues
      .map((cue) => {
        // 确保每个字幕片段都有正确的格式和换行
        const lines = [
          cue.index.toString(),
          this.formatTimestamp(cue.timestamp),
          cue.text,
        ];
        return lines.join("\n");
      })
      .join("\n\n");
  }

  /**
   * 重置生成器状态
   */
  public reset(): void {
    this.cues = [];
    this.currentIndex = 1;
  }
}

/**
 * 字幕生成器工厂
 */
export class SubtitleGeneratorFactory {
  static create(config: Partial<SubtitleConfig> = {}): SubtitleGenerator {
    return new SRTGenerator(config);
  }
}

// 重新导出类型
export {
  type SubtitleCue,
  type SubtitleConfig,
  type SubtitleGenerator,
  type SubtitleTimestamp,
  type WordBoundaryMessage,
} from "../types/subtitle.ts";