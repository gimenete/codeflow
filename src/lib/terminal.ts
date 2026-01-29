// Type declarations for PTY API

export interface PtyCreateResult {
  sessionId: string;
  pid: number;
}

export interface PtyOutputEvent {
  sessionId: string;
  data: string;
}

export interface PtyExitEvent {
  sessionId: string;
  exitCode: number;
}

export interface PtyAPI {
  create(cwd: string): Promise<PtyCreateResult>;
  write(sessionId: string, data: string): Promise<void>;
  resize(sessionId: string, cols: number, rows: number): Promise<void>;
  kill(sessionId: string): Promise<void>;
  onOutput(callback: (event: PtyOutputEvent) => void): void;
  onExit(callback: (event: PtyExitEvent) => void): void;
  removeAllListeners(): void;
}

declare global {
  interface Window {
    ptyAPI?: PtyAPI;
  }
}
