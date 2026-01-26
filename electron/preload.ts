import { contextBridge, ipcRenderer } from "electron";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";

// Type definitions for the exposed APIs
interface GitFileStatus {
  path: string;
  status: string;
}

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
}

interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  additions?: number;
  deletions?: number;
}

interface CommitFile {
  path: string;
  status: string;
  diff: string;
}

interface CommitDetail {
  commit: GitCommit;
  files: CommitFile[];
}

interface OperationResult {
  success: boolean;
  error?: string;
}

interface ClaudeCliCredentials {
  accessToken: string | null;
  expiresAt: number | null;
}

type MessageCallback = (message: SDKMessage) => void;
type SimpleCallback = () => void;
type ErrorCallback = (error: string) => void;

// Git API
const gitAPI = {
  getCurrentBranch: (path: string): Promise<string> => {
    return ipcRenderer.invoke("git:current-branch", path);
  },

  getBranches: (path: string): Promise<string[]> => {
    return ipcRenderer.invoke("git:branches", path);
  },

  getStatus: (path: string): Promise<GitStatus> => {
    return ipcRenderer.invoke("git:status", path);
  },

  getLog: (
    path: string,
    branch: string,
    limit: number,
  ): Promise<GitCommit[]> => {
    return ipcRenderer.invoke("git:log", path, branch, limit);
  },

  getDiffFile: (path: string, file: string): Promise<string> => {
    return ipcRenderer.invoke("git:diff-file", path, file);
  },

  getCommitDetail: (path: string, sha: string): Promise<CommitDetail> => {
    return ipcRenderer.invoke("git:commit-detail", path, sha);
  },

  commit: (path: string, files: string[], message: string): Promise<string> => {
    return ipcRenderer.invoke("git:commit", path, files, message);
  },

  getRemoteUrl: (path: string, remote: string): Promise<string> => {
    return ipcRenderer.invoke("git:remote-url", path, remote);
  },

  fetch: (path: string, remote: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:fetch", path, remote);
  },

  pull: (
    path: string,
    remote: string,
    branch: string,
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:pull", path, remote, branch);
  },

  push: (
    path: string,
    remote: string,
    branch: string,
    force: boolean,
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:push", path, remote, branch, force);
  },

  createBranch: (
    path: string,
    branchName: string,
    checkout: boolean,
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:create-branch", path, branchName, checkout);
  },

  checkout: (path: string, branch: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:checkout", path, branch);
  },

  deleteBranch: (
    path: string,
    branch: string,
    force: boolean,
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:delete-branch", path, branch, force);
  },
};

// Credential API
const credentialAPI = {
  get: (key: string): Promise<string | null> => {
    return ipcRenderer.invoke("credential:get", key);
  },

  set: (key: string, value: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("credential:set", key, value);
  },

  delete: (key: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("credential:delete", key);
  },

  getClaudeCliCredentials: (): Promise<ClaudeCliCredentials> => {
    return ipcRenderer.invoke("credential:get-claude-cli");
  },
};

// Dialog API
const dialogAPI = {
  openFolder: (): Promise<string | null> => {
    return ipcRenderer.invoke("dialog:open-folder");
  },
};

// Claude Agent API
const claudeAgentAPI = {
  sendPrompt: (prompt: string): Promise<void> => {
    return ipcRenderer.invoke("agent:query", prompt);
  },

  interrupt: (): Promise<void> => {
    return ipcRenderer.invoke("agent:interrupt");
  },

  onMessage: (callback: MessageCallback): void => {
    ipcRenderer.on("agent:message", (_event, message) => callback(message));
  },

  onDone: (callback: SimpleCallback): void => {
    ipcRenderer.on("agent:done", () => callback());
  },

  onInterrupted: (callback: SimpleCallback): void => {
    ipcRenderer.on("agent:interrupted", () => callback());
  },

  onError: (callback: ErrorCallback): void => {
    ipcRenderer.on("agent:error", (_event, error) => callback(error));
  },

  removeAllListeners: (): void => {
    ipcRenderer.removeAllListeners("agent:message");
    ipcRenderer.removeAllListeners("agent:done");
    ipcRenderer.removeAllListeners("agent:interrupted");
    ipcRenderer.removeAllListeners("agent:error");
  },
};

// Shell API
const shellAPI = {
  openExternal: (url: string): Promise<void> => {
    return ipcRenderer.invoke("shell:open-external", url);
  },
};

// Claude Chat API (uses Agent SDK in main process)
const claudeChatAPI = {
  sendMessage: (
    prompt: string,
    options?: { systemPrompt?: string; allowedTools?: string[] },
  ): Promise<void> => {
    return ipcRenderer.invoke("claude:chat", prompt, options);
  },

  interrupt: (): Promise<void> => {
    return ipcRenderer.invoke("claude:chat:interrupt");
  },

  onMessage: (callback: MessageCallback): void => {
    ipcRenderer.on("claude:chat:message", (_event, message) =>
      callback(message),
    );
  },

  onDone: (callback: SimpleCallback): void => {
    ipcRenderer.on("claude:chat:done", () => callback());
  },

  onInterrupted: (callback: SimpleCallback): void => {
    ipcRenderer.on("claude:chat:interrupted", () => callback());
  },

  onError: (callback: ErrorCallback): void => {
    ipcRenderer.on("claude:chat:error", (_event, error) => callback(error));
  },

  removeAllListeners: (): void => {
    ipcRenderer.removeAllListeners("claude:chat:message");
    ipcRenderer.removeAllListeners("claude:chat:done");
    ipcRenderer.removeAllListeners("claude:chat:interrupted");
    ipcRenderer.removeAllListeners("claude:chat:error");
  },
};

// Expose APIs to renderer
contextBridge.exposeInMainWorld("electronAPI", {
  git: gitAPI,
  credential: credentialAPI,
  dialog: dialogAPI,
  claudeAgent: claudeAgentAPI,
  claudeChat: claudeChatAPI,
  shell: shellAPI,
  isElectron: true,
});

// Also expose individual APIs for convenience
contextBridge.exposeInMainWorld("gitAPI", gitAPI);
contextBridge.exposeInMainWorld("credentialAPI", credentialAPI);
contextBridge.exposeInMainWorld("dialogAPI", dialogAPI);
contextBridge.exposeInMainWorld("claudeAgentAPI", claudeAgentAPI);
contextBridge.exposeInMainWorld("claudeChatAPI", claudeChatAPI);
contextBridge.exposeInMainWorld("shellAPI", shellAPI);
