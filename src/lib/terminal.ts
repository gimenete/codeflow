// Type declarations for PTY API

export interface PtyCreateResult {
  sessionId: string;
  pid: number;
}

export interface PtyCreateOrGetResult {
  sessionId: string;
  pid: number;
  isExisting: boolean;
}

export interface PtyAttachResult {
  success: boolean;
  bufferedOutput?: string[];
  pid?: number;
  error?: string;
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
  createOrGet(branchId: string, cwd: string): Promise<PtyCreateOrGetResult>;
  attach(sessionId: string): Promise<PtyAttachResult>;
  detach(sessionId: string): Promise<{ success: boolean }>;
  getSessionForBranch(branchId: string): Promise<{ sessionId: string | null }>;
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
