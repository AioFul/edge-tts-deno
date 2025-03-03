import { TRUSTED_CLIENT_TOKEN } from "../constants.ts";

/**
 * DRM 实现
 * 参考原edge_tts/drm.py
 */

const WIN_EPOCH = 11644473600; // Windows文件时间纪元（1601-01-01 00:00:00 UTC）
const S_TO_NS = 1e9; // 秒到纳秒的转换

/**
 * DRM工具类
 */
export class DRM {
  private static clockSkewSeconds = 0.0;

  /**
   * 调整时钟偏差（秒）
   */
  static adjustClockSkewSeconds(skewSeconds: number): void {
    this.clockSkewSeconds += skewSeconds;
  }

  /**
   * 获取Unix时间戳（带时钟偏差校正）
   */
  private static getUnixTimestamp(): number {
    // 使用UTC时间戳以确保和Python版本行为一致
    return (new Date().getTime() / 1000) + this.clockSkewSeconds;
  }

  /**
   * 解析RFC2616日期格式
   */
  private static parseRFC2616Date(date: string): number | null {
    const parsed = Date.parse(date);
    return isNaN(parsed) ? null : parsed / 1000;
  }

  /**
   * 计算SHA-256哈希值
   */
  private static async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 生成SEC-MS-GEC标头值（同步版本）
   */
  static async generateSecMsGec(): Promise<string> {
    // 获取当前时间戳（带时钟偏差校正）
    let ticks = this.getUnixTimestamp();

    // 转换为Windows文件时间（从1601年开始）
    ticks += WIN_EPOCH;

    // 向下取整到最近的5分钟（300秒）
    ticks -= ticks % 300;

    // 转换为100纳秒间隔（Windows文件时间格式）
    ticks *= S_TO_NS / 100;

    // 创建要哈希的字符串
    // 格式化数字以匹配Python版本的精度
    const ticksStr = ticks.toFixed(0);
    const strToHash = `${ticksStr}${TRUSTED_CLIENT_TOKEN}`;
    
    // 使用ASCII编码和真实的SHA-256哈希
    const encoder = new TextEncoder();
    const msgBuffer = encoder.encode(strToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /**
   * 处理403错误响应
   * 参考原DRM.handle_client_response_error()
   */
  static handleClientResponseError(error: Error & { status?: number; headers?: Headers }): void {
    if (error.status === 403) {
      const serverDate = error.headers?.get("Date");
      if (!serverDate) {
        throw new Error("No server date in headers.");
      }

      const serverTimestamp = Date.parse(serverDate) / 1000;
      if (isNaN(serverTimestamp)) {
        throw new Error(`Failed to parse server date: ${serverDate}`);
      }

      const clientTimestamp = this.getUnixTimestamp();
      this.adjustClockSkewSeconds(serverTimestamp - clientTimestamp);
      return;
    }
    throw error;
  }
}