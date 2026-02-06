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
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
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
    skip: number = 0,
  ): Promise<GitCommit[]> => {
    return ipcRenderer.invoke("git:log", path, branch, limit, skip);
  },

  getDiffFile: (path: string, file: string): Promise<string> => {
    return ipcRenderer.invoke("git:diff-file", path, file);
  },

  getDiffStaged: (path: string, file: string): Promise<string> => {
    return ipcRenderer.invoke("git:diff-staged", path, file);
  },

  getDiffHead: (path: string, file: string): Promise<string> => {
    return ipcRenderer.invoke("git:diff-head", path, file);
  },

  stage: (path: string, file: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:stage", path, file);
  },

  unstage: (path: string, file: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:unstage", path, file);
  },

  discard: (path: string, file: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:discard", path, file);
  },

  stageHunk: (path: string, patch: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:stage-hunk", path, patch);
  },

  unstageHunk: (path: string, patch: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:unstage-hunk", path, patch);
  },

  discardHunk: (path: string, patch: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:discard-hunk", path, patch);
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

  pullWithOptions: (
    path: string,
    remote: string,
    branch: string,
    options: string[],
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke(
      "git:pull-with-options",
      path,
      remote,
      branch,
      options,
    );
  },

  push: (
    path: string,
    remote: string,
    branch: string,
    force: boolean,
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:push", path, remote, branch, force);
  },

  resetToRemote: (
    path: string,
    remote: string,
    branch: string,
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:reset-to-remote", path, remote, branch);
  },

  createBranch: (
    path: string,
    branchName: string,
    checkout: boolean,
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:create-branch", path, branchName, checkout);
  },

  createWorktree: (
    path: string,
    worktreePath: string,
    branchName: string,
  ): Promise<OperationResult & { subdirPrefix?: string }> => {
    return ipcRenderer.invoke(
      "git:create-worktree",
      path,
      worktreePath,
      branchName,
    );
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

  renameBranch: (
    path: string,
    oldName: string,
    newName: string,
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke("git:rename-branch", path, oldName, newName);
  },

  mergeBranch: (
    path: string,
    sourceBranch: string,
    targetBranch: string,
    strategy: "merge" | "squash" | "rebase",
  ): Promise<OperationResult> => {
    return ipcRenderer.invoke(
      "git:merge-branch",
      path,
      sourceBranch,
      targetBranch,
      strategy,
    );
  },

  parseRemoteUrl: (
    path: string,
    remoteName?: string,
  ): Promise<{
    owner: string | null;
    repo: string | null;
    host: string | null;
  }> => {
    return ipcRenderer.invoke("git:parse-remote-url", path, remoteName);
  },

  getDiffBase: (path: string, baseBranch?: string): Promise<string> => {
    return ipcRenderer.invoke("git:diff-base", path, baseBranch);
  },

  getDiffSummary: (
    path: string,
  ): Promise<{
    insertions: number;
    deletions: number;
    filesChanged: number;
  }> => {
    return ipcRenderer.invoke("git:diff-summary", path);
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

// File Watcher API
interface WatcherChangeEvent {
  id: string;
  event: string;
  path: string;
}

type WatcherChangeCallback = (event: WatcherChangeEvent) => void;

const watcherAPI = {
  start: (watcherId: string, watchPath: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("watcher:start", watcherId, watchPath);
  },

  stop: (watcherId: string): Promise<OperationResult> => {
    return ipcRenderer.invoke("watcher:stop", watcherId);
  },

  onChange: (callback: WatcherChangeCallback): void => {
    ipcRenderer.on("watcher:change", (_event, data) => callback(data));
  },

  removeAllListeners: (): void => {
    ipcRenderer.removeAllListeners("watcher:change");
  },
};

// PTY API
interface PtyCreateResult {
  sessionId: string;
  pid: number;
}

interface PtyCreateOrGetResult {
  sessionId: string;
  pid: number;
  isExisting: boolean;
}

interface PtyAttachResult {
  success: boolean;
  bufferedOutput?: string[];
  pid?: number;
  error?: string;
}

interface PtyOutputEvent {
  sessionId: string;
  data: string;
}

interface PtyExitEvent {
  sessionId: string;
  exitCode: number;
}

const ptyAPI = {
  create: (cwd: string): Promise<PtyCreateResult> => {
    return ipcRenderer.invoke("pty:create", cwd);
  },

  createOrGet: (paneId: string, cwd: string): Promise<PtyCreateOrGetResult> => {
    return ipcRenderer.invoke("pty:create-or-get", paneId, cwd);
  },

  attach: (sessionId: string): Promise<PtyAttachResult> => {
    return ipcRenderer.invoke("pty:attach", sessionId);
  },

  detach: (sessionId: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke("pty:detach", sessionId);
  },

  getSessionForPane: (
    paneId: string,
  ): Promise<{ sessionId: string | null }> => {
    return ipcRenderer.invoke("pty:get-session-for-pane", paneId);
  },

  write: (sessionId: string, data: string): Promise<void> => {
    return ipcRenderer.invoke("pty:write", sessionId, data);
  },

  resize: (sessionId: string, cols: number, rows: number): Promise<void> => {
    return ipcRenderer.invoke("pty:resize", sessionId, cols, rows);
  },

  kill: (sessionId: string): Promise<void> => {
    return ipcRenderer.invoke("pty:kill", sessionId);
  },

  onOutput: (callback: (event: PtyOutputEvent) => void): void => {
    ipcRenderer.on("pty:output", (_event, data) => callback(data));
  },

  onExit: (callback: (event: PtyExitEvent) => void): void => {
    ipcRenderer.on("pty:exit", (_event, data) => callback(data));
  },

  removeAllListeners: (): void => {
    ipcRenderer.removeAllListeners("pty:output");
    ipcRenderer.removeAllListeners("pty:exit");
  },
};

// Image content for Claude API
interface ImageContent {
  type: "base64";
  media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  data: string;
}

// Claude Chat API (uses Agent SDK in main process)
const claudeChatAPI = {
  sendMessage: (
    prompt: string,
    options?: {
      systemPrompt?: string;
      allowedTools?: string[];
      cwd?: string;
      permissionMode?: string;
      sessionId?: string;
      images?: ImageContent[];
    },
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

  onPermissionRequest: (callback: (request: unknown) => void): void => {
    ipcRenderer.on("claude:chat:permission-request", (_event, request) =>
      callback(request),
    );
  },

  respondToPermission: (response: {
    requestId: string;
    behavior: string;
    message?: string;
    updatedPermissions?: unknown[];
  }): Promise<void> => {
    return ipcRenderer.invoke("claude:chat:permission-response", response);
  },

  removeAllListeners: (): void => {
    ipcRenderer.removeAllListeners("claude:chat:message");
    ipcRenderer.removeAllListeners("claude:chat:done");
    ipcRenderer.removeAllListeners("claude:chat:interrupted");
    ipcRenderer.removeAllListeners("claude:chat:error");
    ipcRenderer.removeAllListeners("claude:chat:permission-request");
  },
};

// File System API
interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeEntry[];
  ignored?: boolean;
}

interface SearchResult {
  path: string;
  name: string;
  score: number;
  ignored?: boolean;
}

interface FileEntry {
  path: string;
  name: string;
}

const fsAPI = {
  listDirectory: (
    dirPath: string,
    depth?: number,
  ): Promise<FileTreeEntry[]> => {
    return ipcRenderer.invoke("fs:list-directory", dirPath, depth);
  },

  readFile: (filePath: string): Promise<string> => {
    return ipcRenderer.invoke("fs:read-file", filePath);
  },

  expandDirectory: (
    dirPath: string,
    rootPath?: string,
  ): Promise<FileTreeEntry[]> => {
    return ipcRenderer.invoke("fs:expand-directory", dirPath, rootPath);
  },

  searchFiles: (
    rootPath: string,
    pattern: string,
    limit?: number,
  ): Promise<SearchResult[]> => {
    return ipcRenderer.invoke("fs:search-files", rootPath, pattern, limit);
  },

  listAllFiles: (rootPath: string, limit?: number): Promise<FileEntry[]> => {
    return ipcRenderer.invoke("fs:list-all-files", rootPath, limit);
  },
};

// App Info API
interface AppInfo {
  appVersion: string;
  claudeSdkVersion: string;
}

const appAPI = {
  getInfo: (): Promise<AppInfo> => {
    return ipcRenderer.invoke("app:get-info");
  },

  getUsername: (): Promise<string> => {
    return ipcRenderer.invoke("app:get-username");
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
  watcher: watcherAPI,
  pty: ptyAPI,
  app: appAPI,
  isElectron: true,
});

// Also expose individual APIs for convenience
contextBridge.exposeInMainWorld("gitAPI", gitAPI);
contextBridge.exposeInMainWorld("credentialAPI", credentialAPI);
contextBridge.exposeInMainWorld("dialogAPI", dialogAPI);
contextBridge.exposeInMainWorld("claudeAgentAPI", claudeAgentAPI);
contextBridge.exposeInMainWorld("claudeChatAPI", claudeChatAPI);
contextBridge.exposeInMainWorld("shellAPI", shellAPI);
contextBridge.exposeInMainWorld("watcherAPI", watcherAPI);
contextBridge.exposeInMainWorld("ptyAPI", ptyAPI);
contextBridge.exposeInMainWorld("fsAPI", fsAPI);
contextBridge.exposeInMainWorld("appAPI", appAPI);
