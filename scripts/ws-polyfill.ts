// Cloudflare Workers WebSocket 类型定义
interface CloudflareWebSocket extends WebSocket {
  accept(): void;
}

// WebSocketPair 类型定义
interface WebSocketPair {
  0: CloudflareWebSocket;
  1: CloudflareWebSocket;
}

declare const WebSocketPair: {
  new(): WebSocketPair;
};

class EdgeTTSWebSocket implements WebSocket {
  // WebSocket 状态常量
  public readonly CONNECTING = 0;
  public readonly OPEN = 1;
  public readonly CLOSING = 2;
  public readonly CLOSED = 3;

  private _readyState: number = this.CONNECTING;
  private _url: string;
  private _headers: Record<string, string>;
  private _ws: WebSocket | null = null;
  private _binaryType: BinaryType = 'arraybuffer';
  private _protocol: string = '';
  private _extensions: string = '';
  private _messageQueue: any[] = []; // 消息队列

  // 实现 WebSocket 接口所需的属性
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(url: string | URL, protocolOrOptions?: string | string[] | { headers?: Record<string, string> }) {
    this._url = url.toString();
    this._headers = {};

    // 处理协议或选项
    if (typeof protocolOrOptions === 'object' && !Array.isArray(protocolOrOptions)) {
      this._headers = protocolOrOptions.headers || {};
    } else if (typeof protocolOrOptions === 'string') {
      this._protocol = protocolOrOptions;
    } else if (Array.isArray(protocolOrOptions)) {
      this._protocol = protocolOrOptions[0] || '';
    }

    this._connect();
    // 定时处理消息队列
    setInterval(() => this._processMessageQueue(), 0); // 尽可能快地处理队列
  }

  private _processMessageQueue() {
    if (this.onmessage && this._messageQueue.length > 0) {
      const messageData = this._messageQueue.shift();
      this.onmessage({ data: messageData } as MessageEvent); // 模拟 MessageEvent
    }
  }

  private async _connect() {
    if (this._ws) {
      try {
        this._ws.close();
      } catch {}
      this._ws = null;
    }

    try {
      // 检查是否在 Cloudflare Workers 环境中
      if (typeof WebSocketPair !== 'undefined') {
        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1] as CloudflareWebSocket;

        // 设置服务端处理器
        server.accept();

        (async () => {
          try {
            // 构建连接请求
            const wsUrl = new URL(this._url);
            for (const [key, value] of Object.entries(this._headers)) {
              if (key.toLowerCase() !== 'sec-websocket-protocol') {
                wsUrl.searchParams.set(`header-${key}`, value);
              }
            }

            // 创建对远程服务器的连接
            const remoteWs = new globalThis.WebSocket(wsUrl.toString(), this._protocol || undefined);

            // 转发消息
            remoteWs.onmessage = async (event: MessageEvent) => {
              try {
                if (event.data instanceof ArrayBuffer) {
                  server.send(new Uint8Array(event.data));
                } else if (event.data instanceof Blob) {
                  const arrayBuffer = await event.data.arrayBuffer();
                  server.send(new Uint8Array(arrayBuffer));
                } else if (typeof event.data === 'string') {
                  server.send(event.data);
                }
              } catch (error) {
                console.error('Error forwarding remote message:', error);
                server.close(1011, 'Message forwarding error');
              }
            };
            remoteWs.onclose = () => server.close();
            remoteWs.onerror = () => server.close();

            server.addEventListener('message', (event: MessageEvent) => {
              if (remoteWs.readyState === remoteWs.OPEN) {
                remoteWs.send(event.data);
              }
            });

            server.addEventListener('close', () => remoteWs.close());
          } catch (error) {
            server.close();
          }
        })();

        this._ws = client;
      } else {
        // 非 Cloudflare Workers 环境，使用原生 WebSocket
        const wsUrl = new URL(this._url);
        for (const [key, value] of Object.entries(this._headers)) {
          if (key.toLowerCase() !== 'sec-websocket-protocol') {
            wsUrl.searchParams.set(`header-${key}`, value);
          }
        }

        this._ws = new globalThis.WebSocket(wsUrl.toString(), this._protocol || undefined);
      }

      // 必须存在 WebSocket 实例
      if (!this._ws) {
        throw new Error('Failed to create WebSocket instance');
      }

      const ws = this._ws;
      ws.binaryType = this._binaryType;

      // 设置事件处理
      ws.onopen = (event: Event) => {
        if (this._ws === ws) {
          this._readyState = this.OPEN;
          this._protocol = ws.protocol;
          this._extensions = ws.extensions;
          if (this.onopen) this.onopen(event);
        }
      };

      ws.onclose = (event: CloseEvent) => {
        if (this._ws === ws) {
          this._readyState = this.CLOSED;
          if (this.onclose) this.onclose(event);
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        if (this._ws === ws && this.onmessage) {
          this._messageQueue.push(event.data);
          // this.onmessage(event); // 移除直接处理消息的逻辑
        }
      };

      ws.onerror = (event: Event) => {
        if (this._ws === ws && this.onerror) {
          this.onerror(event);
        }
      };

    } catch (error) {
      this._handleError(error);
    }
  }

  private _handleError(error: unknown) {
    this._readyState = this.CLOSED;

    if (this.onerror) {
      const errorEvent = new Event('error');
      Object.defineProperty(errorEvent, 'error', { value: error });
      this.onerror(errorEvent);
    }

    if (this.onclose) {
      this.onclose(new CloseEvent('close', {
        wasClean: false,
        code: 1006,
        reason: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  }

  // WebSocket 接口实现
  get url(): string {
    return this._url;
  }

  get readyState(): number {
    return this._readyState;
  }

  get bufferedAmount(): number {
    return this._ws?.bufferedAmount ?? 0;
  }

  get extensions(): string {
    return this._extensions;
  }

  get protocol(): string {
    return this._protocol;
  }

  get binaryType(): BinaryType {
    return this._binaryType;
  }

  set binaryType(value: BinaryType) {
    this._binaryType = value;
    if (this._ws) {
      this._ws.binaryType = value;
    }
  }

  // WebSocket 方法实现
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this._readyState !== this.OPEN) {
      throw new Error('WebSocket is not open');
    }

    if (!this._ws) {
      throw new Error('WebSocket is not initialized');
    }

    try {
      this._ws.send(data);
    } catch (error) {
      this._handleError(error);
      throw error;
    }
  }

  close(code?: number, reason?: string): void {
    if (this._readyState === this.CLOSING || this._readyState === this.CLOSED) {
      return;
    }

    this._readyState = this.CLOSING;

    if (this._ws) {
      try {
        this._ws.close(code, reason);
      } catch (error) {
        this._handleError(error);
      }
    }
  }

  // EventTarget 接口实现
  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (this._ws) {
      this._ws.addEventListener(type, listener, options);
    }
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    if (this._ws) {
      this._ws.removeEventListener(type, listener, options);
    }
  }

  dispatchEvent(event: Event): boolean {
    return this._ws?.dispatchEvent(event) ?? false;
  }
}

// 替换全局 WebSocket
(globalThis as any).WebSocket = EdgeTTSWebSocket;

export const WebSocket = EdgeTTSWebSocket;
export default EdgeTTSWebSocket;