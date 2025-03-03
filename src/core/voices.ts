// edge-tts-deno/src/core/voices.ts
import { TRUSTED_CLIENT_TOKEN } from "../constants.ts";

/**
 * 语音信息接口
 */
export interface Voice {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
  SuggestedCodec?: string;
  FriendlyName?: string;
  Status: string;
  VoiceTag?: {
    ContentCategories: string[];
    VoicePersonalities: string[];
  };
}

export const VoiceStorage = new Map<string, Voice[]>(); // 使用内存存储作为临时替代

/**
 * 获取语音列表
 * @returns 语音列表
 */
export async function getVoices(): Promise<Voice[]> {
  // 缓存语音列表
  const cacheKey = "edge-tts-voices";
  if (VoiceStorage.has(cacheKey)) {
    return VoiceStorage.get(cacheKey)!;
  }
  const url =
    `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=${TRUSTED_CLIENT_TOKEN}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.statusText}`);
  }
  const voices: Voice[] = await response.json();
  // 缓存语音列表
  VoiceStorage.set(cacheKey, voices);
  return voices;
}

/**
 * 语音特性分类
 * @param voices 语音列表
 * @param category 分类依据，如 "Gender"、"Locale"
 * @returns 分类后的语音列表
 */
export function classifyVoices(voices: Voice[], category: keyof Voice): Record<string, Voice[]> {
  const classified: Record<string, Voice[]> = {};
  for (const voice of voices) {
    const value = voice[category];
    if (typeof value === 'string') {
      if (!classified[value]) {
        classified[value] = [];
      }
      classified[value].push(voice);
    }

  }
  return classified;
}

/**
 * 格式化语音信息
 * @param voice 语音信息
 * @returns 格式化后的字符串
 */
export function formatVoiceInfo(voice: Voice): string {
  return `Name: ${voice.Name}\nShortName: ${voice.ShortName}\nGender: ${voice.Gender}\nLocale: ${voice.Locale}\nFriendlyName: ${voice.FriendlyName}`;
}