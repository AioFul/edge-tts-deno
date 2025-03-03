/**
 * 字幕相关类型定义
 */

export interface SubtitleConfig {
  wordsPerCue?: number;
}

export const DEFAULT_SUBTITLE_CONFIG: Required<SubtitleConfig> = {
  wordsPerCue: 10,
};

export interface SubtitleTimestamp {
  start: number;
  duration: number;
  end: number;
}

export interface SubtitleCue {
  index: number;
  timestamp: SubtitleTimestamp;
  text: string;
}

export interface WordBoundaryMessage {
  type: "WordBoundary";
  offset: number;
  duration: number;
  text: string;
}

export interface SubtitleGenerator {
  addCue(msg: WordBoundaryMessage): void;
  getCues(): SubtitleCue[];
  mergeCues(words: number): void;
  generate(): string;
  reset(): void;
}