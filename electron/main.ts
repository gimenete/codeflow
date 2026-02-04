import { app, BrowserWindow, ipcMain, dialog } from "electron";
import {
  query,
  type PermissionResult,
  type PermissionUpdate,
} from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import ignore, { Ignore } from "ignore";

const execAsync = promisify(exec);
import { simpleGit, SimpleGit, StatusResult } from "simple-git";
import keytar from "keytar";
import chokidar from "chokidar";
import pty from "node-pty";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_NAME = "codeflow";
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let currentAbortController: AbortController | null = null;
let currentQuery: ReturnType<typeof query> | null = null;
let chatAbortController: AbortController | null = null;
let chatQuery: ReturnType<typeof query> | null = null;

// Map of requestId -> { resolve, reject } for pending permission requests
const pendingPermissionResolvers = new Map<
  string,
  {
    resolve: (result: {
      behavior: string;
      message?: string;
      updatedPermissions?: PermissionUpdate[];
    }) => void;
    reject: (error: Error) => void;
  }
>();

// Creates a canUseTool callback that bridges permission requests to the renderer via IPC
function createCanUseToolCallback(): (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    suggestions?: PermissionUpdate[];
    blockedPath?: string;
    decisionReason?: string;
    toolUseID: string;
    agentID?: string;
  },
) => Promise<PermissionResult> {
  return (toolName, input, options) => {
    return new Promise((resolve, reject) => {
      const requestId = crypto.randomUUID();

      // If already aborted, deny immediately
      if (options.signal.aborted) {
        resolve({
          behavior: "deny",
          message: "Request was cancelled",
          toolUseID: options.toolUseID,
        });
        return;
      }

      // Listen for abort
      const onAbort = () => {
        pendingPermissionResolvers.delete(requestId);
        resolve({
          behavior: "deny",
          message: "Request was cancelled by user",
          toolUseID: options.toolUseID,
        });
      };
      options.signal.addEventListener("abort", onAbort, { once: true });

      // Store the resolver
      pendingPermissionResolvers.set(requestId, {
        resolve: (result) => {
          options.signal.removeEventListener("abort", onAbort);
          pendingPermissionResolvers.delete(requestId);
          if (result.behavior === "allow") {
            resolve({
              behavior: "allow",
              updatedPermissions: result.updatedPermissions,
              toolUseID: options.toolUseID,
            });
          } else {
            resolve({
              behavior: "deny",
              message: result.message || "Permission denied by user",
              toolUseID: options.toolUseID,
            });
          }
        },
        reject: (error) => {
          options.signal.removeEventListener("abort", onAbort);
          pendingPermissionResolvers.delete(requestId);
          reject(error);
        },
      });

      // Send permission request to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("claude:chat:permission-request", {
          requestId,
          toolName,
          input,
          decisionReason: options.decisionReason,
          blockedPath: options.blockedPath,
          toolUseID: options.toolUseID,
          agentID: options.agentID,
          suggestions: options.suggestions,
        });
      } else {
        // No window available, deny
        pendingPermissionResolvers.delete(requestId);
        options.signal.removeEventListener("abort", onAbort);
        resolve({
          behavior: "deny",
          message: "Application window not available",
          toolUseID: options.toolUseID,
        });
      }
    });
  };
}

// File watchers map (watcherId -> watcher instance)
const fileWatchers = new Map<string, chokidar.FSWatcher>();

// PTY sessions map (sessionId -> pty instance)
const ptySessions = new Map<string, pty.IPty>();

// PTY session metadata for persistence
interface PtySessionMetadata {
  paneId: string;
  cwd: string;
  createdAt: number;
  lastActivityAt: number;
  outputBuffer: string[]; // Last N lines for replay
  idleTimeoutId?: NodeJS.Timeout;
}

const ptySessionMetadata = new Map<string, PtySessionMetadata>();
const paneToSessionId = new Map<string, string>();

// Idle timeout for sessions (1 hour)
const PTY_IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const PTY_OUTPUT_BUFFER_SIZE = 1000;

// Git types
interface GitFileStatus {
  path: string;
  status: string;
}

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  tracking: string | null;
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

interface ClaudeCliCredentials {
  accessToken: string | null;
  expiresAt: number | null;
}

// Helper to get git instance for a path
function getGit(repoPath: string): SimpleGit {
  return simpleGit(repoPath);
}

// Helper to get the subdirectory prefix when cwd is inside a monorepo subfolder.
// Returns e.g. "packages/app/" when cwd is a subfolder, or "" at the git root.
async function getSubdirPrefix(git: SimpleGit): Promise<string> {
  try {
    const prefix = await git.revparse(["--show-prefix"]);
    return prefix.trim();
  } catch {
    return "";
  }
}

// Helper to apply patch content (writes to temp file since simple-git expects file paths)
async function applyPatchContent(
  git: SimpleGit,
  patchContent: string,
  options: string[],
): Promise<void> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(
    tempDir,
    `git-patch-${Date.now()}-${Math.random().toString(36).slice(2)}.patch`,
  );

  try {
    await fs.promises.writeFile(tempFile, patchContent, "utf-8");
    await git.applyPatch(tempFile, options);
  } finally {
    // Clean up temp file
    try {
      await fs.promises.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Needed for keytar
      preload: path.join(__dirname, "preload.cjs"),
    },
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  if (isDev) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const devtools = (await import("electron-devtools-installer")) as any;
      const installExtension = devtools.installExtension || devtools.default;
      console.log(
        "devtools.REACT_DEVELOPER_TOOLS:",
        devtools.REACT_DEVELOPER_TOOLS,
      );
      await installExtension(devtools.REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: { allowFileAccess: true },
      });
      console.log("React DevTools installed");
    } catch (err) {
      console.error("Failed to install React DevTools:", err);
    }
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// ==================== Git IPC Handlers ====================

ipcMain.handle("git:current-branch", async (_event, repoPath: string) => {
  try {
    const git = getGit(repoPath);
    const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
    return branch.trim() || "HEAD";
  } catch (error) {
    console.error("git:current-branch error:", error);
    return "main";
  }
});

ipcMain.handle("git:branches", async (_event, repoPath: string) => {
  try {
    const git = getGit(repoPath);
    const branchSummary = await git.branchLocal();
    return branchSummary.all;
  } catch (error) {
    console.error("git:branches error:", error);
    return ["main"];
  }
});

ipcMain.handle("git:status", async (_event, repoPath: string) => {
  try {
    const git = getGit(repoPath);
    const status: StatusResult = await git.status();

    // Map git status codes to our status types
    // Status codes: ' ' = unmodified, M = modified, A = added, D = deleted, R = renamed, C = copied, ? = untracked
    const mapStagedStatusCode = (index: string): GitFileStatus["status"] => {
      if (index === "D") return "deleted";
      if (index === "R") return "renamed";
      if (index === "A") return "added";
      if (index === "M") return "modified";
      return "modified"; // fallback
    };

    const mapUnstagedStatusCode = (
      workingDir: string,
    ): GitFileStatus["status"] => {
      if (workingDir === "?") return "untracked";
      if (workingDir === "D") return "deleted";
      if (workingDir === "M") return "modified";
      if (workingDir === "A") return "added";
      return "modified"; // fallback
    };

    // When cwd is a subfolder in a monorepo, git status returns paths relative
    // to the git root. We filter to only files in our subfolder and strip the prefix
    // so paths are cwd-relative (consistent with how diff/stage/unstage resolve paths).
    const prefix = await getSubdirPrefix(git);

    // Process files into staged and unstaged arrays
    // A file can appear in BOTH arrays if it has both staged and unstaged changes
    const stagedFiles: GitFileStatus[] = [];
    const unstagedFiles: GitFileStatus[] = [];

    for (const file of status.files) {
      // Filter to files within the subdirectory prefix
      if (prefix && !file.path.startsWith(prefix)) {
        continue;
      }
      // Strip prefix to make paths cwd-relative
      const filePath = prefix ? file.path.slice(prefix.length) : file.path;

      const { index, working_dir } = file;

      // Staged: index is not ' ' (unmodified) and not '?' (untracked)
      if (index !== " " && index !== "?") {
        stagedFiles.push({
          path: filePath,
          status: mapStagedStatusCode(index),
        });
      }

      // Unstaged: working_dir is not ' ' (unmodified)
      if (working_dir !== " ") {
        unstagedFiles.push({
          path: filePath,
          status: mapUnstagedStatusCode(working_dir),
        });
      }
    }

    const result: GitStatus = {
      branch: status.current || "HEAD",
      ahead: status.ahead,
      behind: status.behind,
      tracking: status.tracking || null,
      stagedFiles,
      unstagedFiles,
    };

    return result;
  } catch (error) {
    console.error("git:status error:", error);
    return {
      branch: "main",
      ahead: 0,
      behind: 0,
      tracking: null,
      stagedFiles: [],
      unstagedFiles: [],
    };
  }
});

ipcMain.handle(
  "git:log",
  async (
    _event,
    repoPath: string,
    branch: string,
    limit: number,
    skip: number = 0,
  ) => {
    try {
      const git = getGit(repoPath);
      const options: Record<string, unknown> = {
        maxCount: limit,
        [branch]: null,
      };
      if (skip > 0) {
        options["--skip"] = skip;
      }
      const log = await git.log(options);

      const commits: GitCommit[] = log.all.map((commit) => ({
        sha: commit.hash,
        message: commit.message.split("\n")[0],
        author: commit.author_name,
        date: commit.date,
        additions: undefined,
        deletions: undefined,
      }));

      return commits;
    } catch (error) {
      console.error("git:log error:", error);
      return [];
    }
  },
);

ipcMain.handle(
  "git:diff-file",
  async (_event, repoPath: string, file: string) => {
    try {
      const git = getGit(repoPath);
      const diff = await git.diff(["--", file]);
      return diff;
    } catch (error) {
      console.error("git:diff-file error:", error);
      return "";
    }
  },
);

ipcMain.handle(
  "git:diff-staged",
  async (_event, repoPath: string, file: string) => {
    try {
      const git = getGit(repoPath);
      const diff = await git.diff(["--cached", "--", file]);
      return diff;
    } catch (error) {
      console.error("git:diff-staged error:", error);
      return "";
    }
  },
);

ipcMain.handle(
  "git:diff-head",
  async (_event, repoPath: string, file: string) => {
    try {
      const git = getGit(repoPath);
      const diff = await git.diff(["HEAD", "--", file]);
      return diff;
    } catch (error) {
      console.error("git:diff-head error:", error);
      return "";
    }
  },
);

// Stage a file
ipcMain.handle("git:stage", async (_event, repoPath: string, file: string) => {
  try {
    const git = getGit(repoPath);
    await git.add([file]);
    return { success: true };
  } catch (error) {
    console.error("git:stage error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

// Unstage a file
ipcMain.handle(
  "git:unstage",
  async (_event, repoPath: string, file: string) => {
    try {
      const git = getGit(repoPath);
      await git.reset(["HEAD", "--", file]);
      return { success: true };
    } catch (error) {
      console.error("git:unstage error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

// Discard changes to a file
ipcMain.handle(
  "git:discard",
  async (_event, repoPath: string, file: string) => {
    try {
      const git = getGit(repoPath);
      await git.checkout(["--", file]);
      return { success: true };
    } catch (error) {
      console.error("git:discard error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

// Stage a hunk (apply patch to index)
ipcMain.handle(
  "git:stage-hunk",
  async (_event, repoPath: string, patch: string) => {
    try {
      const git = getGit(repoPath);
      await applyPatchContent(git, patch, ["--cached"]);
      return { success: true };
    } catch (error) {
      console.error("git:stage-hunk error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

// Unstage a hunk (reverse apply from index)
ipcMain.handle(
  "git:unstage-hunk",
  async (_event, repoPath: string, patch: string) => {
    try {
      const git = getGit(repoPath);
      await applyPatchContent(git, patch, ["--cached", "--reverse"]);
      return { success: true };
    } catch (error) {
      console.error("git:unstage-hunk error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

// Discard a hunk (reverse apply to working directory)
ipcMain.handle(
  "git:discard-hunk",
  async (_event, repoPath: string, patch: string) => {
    try {
      const git = getGit(repoPath);
      await applyPatchContent(git, patch, ["--reverse"]);
      return { success: true };
    } catch (error) {
      console.error("git:discard-hunk error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:commit-detail",
  async (_event, repoPath: string, sha: string) => {
    try {
      const git = getGit(repoPath);

      // Get commit info
      const log = await git.log({
        maxCount: 1,
        [sha]: null,
        "--stat": null,
      });

      const commitInfo = log.latest;
      if (!commitInfo) {
        throw new Error("Commit not found");
      }

      // Get the full diff for this commit
      const diff = await git.show([sha, "--patch", "--format="]);

      // Parse the diff to get files
      const files: CommitFile[] = [];
      const diffSections = diff.split(/^diff --git /m).slice(1);

      for (const section of diffSections) {
        const lines = section.split("\n");
        const headerMatch = lines[0].match(/a\/(.+) b\/(.+)/);
        if (!headerMatch) continue;

        const filePath = headerMatch[2];
        let status = "modified";

        // Check for new/deleted file indicators
        if (section.includes("new file mode")) {
          status = "added";
        } else if (section.includes("deleted file mode")) {
          status = "deleted";
        } else if (section.includes("rename from")) {
          status = "renamed";
        }

        // Reconstruct the full diff with header for the diff viewer
        const fullDiff = "diff --git " + section;

        files.push({
          path: filePath,
          status,
          diff: fullDiff,
        });
      }

      // Parse stats from the diff output
      const statMatch = diff.match(/(\d+) insertions?\(\+\)/);
      const delMatch = diff.match(/(\d+) deletions?\(-\)/);

      const result: CommitDetail = {
        commit: {
          sha: commitInfo.hash,
          message: commitInfo.message,
          author: commitInfo.author_name,
          date: commitInfo.date,
          additions: statMatch ? parseInt(statMatch[1], 10) : 0,
          deletions: delMatch ? parseInt(delMatch[1], 10) : 0,
        },
        files,
      };

      return result;
    } catch (error) {
      console.error("git:commit-detail error:", error);
      throw error;
    }
  },
);

ipcMain.handle(
  "git:commit",
  async (_event, repoPath: string, _files: string[], message: string) => {
    try {
      const git = getGit(repoPath);
      const result = await git.commit(message);
      return result.commit;
    } catch (error) {
      console.error("git:commit error:", error);
      throw error;
    }
  },
);

ipcMain.handle(
  "git:remote-url",
  async (_event, repoPath: string, remote: string) => {
    try {
      const git = getGit(repoPath);
      const remotes = await git.getRemotes(true);
      const remoteObj = remotes.find((r) => r.name === remote);
      return remoteObj?.refs.fetch || "";
    } catch (error) {
      console.error("git:remote-url error:", error);
      return "";
    }
  },
);

ipcMain.handle(
  "git:fetch",
  async (_event, repoPath: string, remote: string) => {
    try {
      const git = getGit(repoPath);
      await git.fetch(remote);
      return { success: true };
    } catch (error) {
      console.error("git:fetch error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:pull",
  async (_event, repoPath: string, remote: string, branch: string) => {
    try {
      const git = getGit(repoPath);
      await git.pull(remote, branch);
      return { success: true };
    } catch (error) {
      console.error("git:pull error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:push",
  async (
    _event,
    repoPath: string,
    remote: string,
    branch: string,
    force: boolean,
  ) => {
    try {
      const git = getGit(repoPath);
      const options = force ? ["--force"] : [];
      await git.push(remote, branch, options);
      return { success: true };
    } catch (error) {
      console.error("git:push error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:create-branch",
  async (_event, repoPath: string, branchName: string, checkout: boolean) => {
    try {
      const git = getGit(repoPath);
      if (checkout) {
        await git.checkoutLocalBranch(branchName);
      } else {
        await git.branch([branchName]);
      }
      return { success: true };
    } catch (error) {
      console.error("git:create-branch error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:create-worktree",
  async (
    _event,
    repoPath: string,
    worktreePath: string,
    branchName: string,
  ) => {
    try {
      const git = getGit(repoPath);
      const subdirPrefix = await getSubdirPrefix(git);
      await git.raw(["worktree", "add", worktreePath, "-b", branchName]);
      return { success: true, subdirPrefix: subdirPrefix || undefined };
    } catch (error) {
      console.error("git:create-worktree error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:checkout",
  async (_event, repoPath: string, branch: string) => {
    try {
      const git = getGit(repoPath);
      await git.checkout(branch);
      return { success: true };
    } catch (error) {
      console.error("git:checkout error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:delete-branch",
  async (
    _event,
    repoPath: string,
    branch: string,
    force: boolean,
    worktreePath?: string,
  ) => {
    try {
      const git = getGit(repoPath);
      // If the branch is checked out in a worktree, remove the worktree first
      if (worktreePath) {
        await git.raw(["worktree", "remove", worktreePath, "--force"]);
      }
      const options = force ? ["-D", branch] : ["-d", branch];
      await git.branch(options);
      return { success: true };
    } catch (error) {
      console.error("git:delete-branch error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:rename-branch",
  async (_event, repoPath: string, oldName: string, newName: string) => {
    try {
      const git = getGit(repoPath);
      await git.branch(["-m", oldName, newName]);
      return { success: true };
    } catch (error) {
      console.error("git:rename-branch error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle(
  "git:merge-branch",
  async (
    _event,
    repoPath: string,
    sourceBranch: string,
    targetBranch: string,
    strategy: "merge" | "squash" | "rebase",
  ) => {
    try {
      const git = getGit(repoPath);
      await git.checkout(targetBranch);
      if (strategy === "merge") {
        await git.merge([sourceBranch]);
      } else if (strategy === "squash") {
        await git.merge([sourceBranch, "--squash"]);
        await git.commit(
          `Squash merge branch '${sourceBranch}' into ${targetBranch}`,
        );
      } else {
        await git.rebase([sourceBranch]);
      }
      return { success: true };
    } catch (error) {
      console.error("git:merge-branch error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

interface ParsedRemoteUrl {
  owner: string | null;
  repo: string | null;
  host: string | null;
}

ipcMain.handle(
  "git:parse-remote-url",
  async (_event, repoPath: string, remoteName = "origin") => {
    try {
      const git = getGit(repoPath);
      const remotes = await git.getRemotes(true);
      const remote = remotes.find((r) => r.name === remoteName);
      const url = remote?.refs.fetch || "";

      if (!url) {
        return { owner: null, repo: null, host: null } as ParsedRemoteUrl;
      }

      // Parse HTTPS URLs: https://github.com/owner/repo.git
      const httpsMatch = url.match(
        /https?:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/,
      );
      if (httpsMatch) {
        return {
          host: httpsMatch[1],
          owner: httpsMatch[2],
          repo: httpsMatch[3].replace(/\.git$/, ""),
        } as ParsedRemoteUrl;
      }

      // Parse SSH URLs: git@github.com:owner/repo.git
      const sshMatch = url.match(/git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (sshMatch) {
        return {
          host: sshMatch[1],
          owner: sshMatch[2],
          repo: sshMatch[3].replace(/\.git$/, ""),
        } as ParsedRemoteUrl;
      }

      return { owner: null, repo: null, host: null } as ParsedRemoteUrl;
    } catch (error) {
      console.error("git:parse-remote-url error:", error);
      return { owner: null, repo: null, host: null } as ParsedRemoteUrl;
    }
  },
);

ipcMain.handle(
  "git:diff-base",
  async (_event, repoPath: string, baseBranch = "main") => {
    try {
      const git = getGit(repoPath);
      // Get diff between current HEAD and the base branch
      const diff = await git.diff([`${baseBranch}...HEAD`, "--", "."]);
      return diff;
    } catch (error) {
      console.error("git:diff-base error:", error);
      return "";
    }
  },
);

ipcMain.handle("git:diff-summary", async (_event, repoPath: string) => {
  try {
    const git = getGit(repoPath);
    const summary = await git.diffSummary(["--", "."]);
    return {
      insertions: summary.insertions,
      deletions: summary.deletions,
      filesChanged: summary.changed,
    };
  } catch (error) {
    console.error("git:diff-summary error:", error);
    return { insertions: 0, deletions: 0, filesChanged: 0 };
  }
});

// ==================== Credential IPC Handlers ====================

ipcMain.handle("credential:get", async (_event, key: string) => {
  try {
    const password = await keytar.getPassword(SERVICE_NAME, key);
    return password;
  } catch (error) {
    console.error("credential:get error:", error);
    return null;
  }
});

ipcMain.handle("credential:set", async (_event, key: string, value: string) => {
  try {
    await keytar.setPassword(SERVICE_NAME, key, value);
    return { success: true };
  } catch (error) {
    console.error("credential:set error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("credential:delete", async (_event, key: string) => {
  try {
    await keytar.deletePassword(SERVICE_NAME, key);
    return { success: true };
  } catch (error) {
    console.error("credential:delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle("credential:get-claude-cli", async () => {
  try {
    // Try macOS Keychain first via keytar
    if (process.platform === "darwin") {
      const username = os.userInfo().username;
      const keychainData = await keytar.getPassword(
        "Claude Code-credentials",
        username,
      );
      if (keychainData) {
        try {
          const parsed = JSON.parse(keychainData);
          if (parsed.claudeAiOauth) {
            const oauth = parsed.claudeAiOauth;
            const nowMs = Date.now();

            if (oauth.expiresAt && oauth.expiresAt > nowMs) {
              return {
                accessToken: oauth.accessToken || null,
                expiresAt: oauth.expiresAt,
              } as ClaudeCliCredentials;
            } else if (oauth.accessToken && !oauth.expiresAt) {
              return {
                accessToken: oauth.accessToken,
                expiresAt: null,
              } as ClaudeCliCredentials;
            }
          }
        } catch {
          // JSON parse error, continue to file fallback
        }
      }
    }

    // Try credentials file (works on all platforms)
    const credPath = path.join(os.homedir(), ".claude", ".credentials.json");
    if (fs.existsSync(credPath)) {
      const content = fs.readFileSync(credPath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.claudeAiOauth) {
        const oauth = parsed.claudeAiOauth;
        const nowMs = Date.now();

        if (oauth.expiresAt && oauth.expiresAt > nowMs) {
          return {
            accessToken: oauth.accessToken || null,
            expiresAt: oauth.expiresAt,
          } as ClaudeCliCredentials;
        } else if (oauth.accessToken && !oauth.expiresAt) {
          return {
            accessToken: oauth.accessToken,
            expiresAt: null,
          } as ClaudeCliCredentials;
        }
      }
    }

    return { accessToken: null, expiresAt: null } as ClaudeCliCredentials;
  } catch (error) {
    console.error("credential:get-claude-cli error:", error);
    return { accessToken: null, expiresAt: null } as ClaudeCliCredentials;
  }
});

// ==================== Dialog IPC Handlers ====================

ipcMain.handle("dialog:open-folder", async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: "Select Folder",
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

// ==================== Claude Agent SDK IPC Handlers ====================

ipcMain.handle("agent:query", async (_event, prompt: string) => {
  if (!mainWindow) return;

  currentAbortController = new AbortController();

  try {
    currentQuery = query({
      prompt,
      options: {
        abortController: currentAbortController,
        allowedTools: ["Read", "Glob", "Grep", "Bash"],
        permissionMode: "acceptEdits",
      },
    });

    for await (const message of currentQuery) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("agent:message", message);
      }
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("agent:done");
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("agent:interrupted");
      }
    } else {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("agent:error", String(error));
      }
    }
  } finally {
    currentAbortController = null;
    currentQuery = null;
  }
});

ipcMain.handle("agent:interrupt", async () => {
  if (currentQuery) {
    await currentQuery.interrupt();
  }
});

// ==================== Shell/URL IPC Handlers ====================

ipcMain.handle("shell:open-external", async (_event, url: string) => {
  const { shell } = await import("electron");
  await shell.openExternal(url);
});

// ==================== Claude Chat IPC Handlers ====================

// Image content type for Claude API
interface ImageContent {
  type: "base64";
  media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  data: string;
}

ipcMain.handle(
  "claude:chat",
  async (
    _event,
    prompt: string,
    options?: {
      systemPrompt?: string;
      allowedTools?: string[];
      cwd?: string;
      permissionMode?: string;
      sessionId?: string;
      images?: ImageContent[];
    },
  ) => {
    if (!mainWindow) return;

    chatAbortController = new AbortController();

    // Build prompt with images if provided
    let finalPrompt: string | Array<{ type: string; [key: string]: unknown }> =
      prompt;
    if (options?.images && options.images.length > 0) {
      // Construct multimodal content blocks
      const contentBlocks: Array<{ type: string; [key: string]: unknown }> = [];

      // Add images first
      for (const img of options.images) {
        contentBlocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.media_type,
            data: img.data,
          },
        });
      }

      // Add text prompt
      if (prompt) {
        contentBlocks.push({
          type: "text",
          text: prompt,
        });
      }

      finalPrompt = contentBlocks;
    }

    try {
      const permMode =
        (options?.permissionMode as
          | "default"
          | "acceptEdits"
          | "plan"
          | "dontAsk") || "acceptEdits";

      chatQuery = query({
        prompt: finalPrompt as string, // SDK accepts string or content blocks
        options: {
          abortController: chatAbortController,
          systemPrompt: options?.systemPrompt || undefined,
          allowedTools: options?.allowedTools || [
            "Read",
            "Glob",
            "Grep",
            "Bash",
          ],
          permissionMode: permMode,
          cwd: options?.cwd || undefined,
          // Resume session if sessionId is provided
          resume: options?.sessionId || undefined,
          // Only provide canUseTool for "default" mode where user approval is needed
          canUseTool:
            permMode === "default" ? createCanUseToolCallback() : undefined,
        },
      });

      for await (const message of chatQuery) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("claude:chat:message", message);
        }
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("claude:chat:done");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("claude:chat:interrupted");
        }
      } else {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("claude:chat:error", String(error));
        }
      }
    } finally {
      chatAbortController = null;
      chatQuery = null;
      // Clean up any pending permission requests
      for (const [, resolver] of pendingPermissionResolvers) {
        resolver.resolve({ behavior: "deny", message: "Query ended" });
      }
      pendingPermissionResolvers.clear();
    }
  },
);

// Handle permission responses from the renderer
ipcMain.handle(
  "claude:chat:permission-response",
  async (
    _event,
    response: {
      requestId: string;
      behavior: string;
      message?: string;
      updatedPermissions?: PermissionUpdate[];
    },
  ) => {
    const resolver = pendingPermissionResolvers.get(response.requestId);
    if (resolver) {
      resolver.resolve(response);
    }
  },
);

ipcMain.handle("claude:chat:interrupt", async () => {
  if (chatQuery) {
    await chatQuery.interrupt();
  }
});

// ==================== File Watcher IPC Handlers ====================

ipcMain.handle(
  "watcher:start",
  async (_event, watcherId: string, watchPath: string) => {
    try {
      // Stop existing watcher with same ID if any
      const existing = fileWatchers.get(watcherId);
      if (existing) {
        await existing.close();
        fileWatchers.delete(watcherId);
      }

      const watcher = chokidar.watch(watchPath, {
        ignored: [
          /(^|[/\\])\../, // Ignore dotfiles
          /node_modules/,
          /\.git/,
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100,
        },
      });

      watcher.on("all", (event, filePath) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("watcher:change", {
            id: watcherId,
            event,
            path: filePath,
          });
        }
      });

      watcher.on("error", (error) => {
        console.error(`Watcher ${watcherId} error:`, error);
      });

      fileWatchers.set(watcherId, watcher);
      return { success: true };
    } catch (error) {
      console.error("watcher:start error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
);

ipcMain.handle("watcher:stop", async (_event, watcherId: string) => {
  try {
    const watcher = fileWatchers.get(watcherId);
    if (watcher) {
      await watcher.close();
      fileWatchers.delete(watcherId);
    }
    return { success: true };
  } catch (error) {
    console.error("watcher:stop error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

// ==================== PTY IPC Handlers ====================

// Helper to reset idle timeout for a session
function resetPtyIdleTimeout(sessionId: string) {
  const meta = ptySessionMetadata.get(sessionId);
  if (!meta) return;

  // Clear existing timeout
  if (meta.idleTimeoutId) {
    clearTimeout(meta.idleTimeoutId);
  }

  // Set new timeout
  meta.idleTimeoutId = setTimeout(() => {
    console.log(`PTY session ${sessionId} idle timeout - killing`);
    const ptyProcess = ptySessions.get(sessionId);
    if (ptyProcess) {
      ptyProcess.kill();
      ptySessions.delete(sessionId);
    }
    // Clean up metadata
    if (meta.paneId) {
      paneToSessionId.delete(meta.paneId);
    }
    ptySessionMetadata.delete(sessionId);
  }, PTY_IDLE_TIMEOUT_MS);

  meta.lastActivityAt = Date.now();
}

// Helper to clean up a PTY session completely
function cleanupPtySession(sessionId: string) {
  const meta = ptySessionMetadata.get(sessionId);
  if (meta) {
    if (meta.idleTimeoutId) {
      clearTimeout(meta.idleTimeoutId);
    }
    if (meta.paneId) {
      paneToSessionId.delete(meta.paneId);
    }
    ptySessionMetadata.delete(sessionId);
  }
  ptySessions.delete(sessionId);
}

ipcMain.handle("pty:create", async (_event, cwd: string) => {
  const sessionId = crypto.randomUUID();
  const shell =
    process.platform === "win32"
      ? "powershell.exe"
      : process.env.SHELL || "/bin/bash";

  try {
    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd: cwd,
      env: process.env as Record<string, string>,
    });

    ptySessions.set(sessionId, ptyProcess);

    // Forward PTY output to renderer
    ptyProcess.onData((data) => {
      mainWindow?.webContents.send("pty:output", { sessionId, data });
    });

    ptyProcess.onExit(({ exitCode }) => {
      mainWindow?.webContents.send("pty:exit", { sessionId, exitCode });
      ptySessions.delete(sessionId);
    });

    return { sessionId, pid: ptyProcess.pid };
  } catch (error) {
    console.error("pty:create error:", error);
    throw error;
  }
});

// Create or get existing session for a pane
ipcMain.handle(
  "pty:create-or-get",
  async (_event, paneId: string, cwd: string) => {
    // Check if session already exists for this pane
    const existingSessionId = paneToSessionId.get(paneId);
    if (existingSessionId) {
      const existingProcess = ptySessions.get(existingSessionId);
      const existingMeta = ptySessionMetadata.get(existingSessionId);
      if (existingProcess && existingMeta) {
        // Session exists and is alive - reset idle timeout and return it
        resetPtyIdleTimeout(existingSessionId);
        return {
          sessionId: existingSessionId,
          pid: existingProcess.pid,
          isExisting: true,
        };
      }
      // Session was orphaned, clean up the mapping
      paneToSessionId.delete(paneId);
    }

    // Create new session
    const sessionId = crypto.randomUUID();
    const shell =
      process.platform === "win32"
        ? "powershell.exe"
        : process.env.SHELL || "/bin/bash";

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd: cwd,
        env: process.env as Record<string, string>,
      });

      ptySessions.set(sessionId, ptyProcess);

      // Create metadata
      const meta: PtySessionMetadata = {
        paneId,
        cwd,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        outputBuffer: [],
      };
      ptySessionMetadata.set(sessionId, meta);
      paneToSessionId.set(paneId, sessionId);

      // Set up idle timeout
      resetPtyIdleTimeout(sessionId);

      // Forward PTY output to renderer and buffer it
      ptyProcess.onData((data) => {
        mainWindow?.webContents.send("pty:output", { sessionId, data });
        // Buffer for replay
        const currentMeta = ptySessionMetadata.get(sessionId);
        if (currentMeta) {
          currentMeta.outputBuffer.push(data);
          if (currentMeta.outputBuffer.length > PTY_OUTPUT_BUFFER_SIZE) {
            currentMeta.outputBuffer.shift();
          }
          currentMeta.lastActivityAt = Date.now();
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        mainWindow?.webContents.send("pty:exit", { sessionId, exitCode });
        cleanupPtySession(sessionId);
      });

      return { sessionId, pid: ptyProcess.pid, isExisting: false };
    } catch (error) {
      console.error("pty:create-or-get error:", error);
      throw error;
    }
  },
);

// Attach to an existing session - returns buffered output for replay
ipcMain.handle("pty:attach", async (_event, sessionId: string) => {
  const meta = ptySessionMetadata.get(sessionId);
  const ptyProcess = ptySessions.get(sessionId);

  if (!meta || !ptyProcess) {
    return { success: false, error: "Session not found" };
  }

  // Reset idle timeout on attach
  resetPtyIdleTimeout(sessionId);

  return {
    success: true,
    bufferedOutput: meta.outputBuffer,
    pid: ptyProcess.pid,
  };
});

// Detach from a session - mark inactive but don't kill
ipcMain.handle("pty:detach", async (_event, sessionId: string) => {
  const meta = ptySessionMetadata.get(sessionId);
  if (meta) {
    // Reset idle timeout - session stays alive but will timeout if not reattached
    resetPtyIdleTimeout(sessionId);
  }
  return { success: true };
});

// Get session ID for a pane (if exists)
ipcMain.handle("pty:get-session-for-pane", async (_event, paneId: string) => {
  const sessionId = paneToSessionId.get(paneId);
  if (sessionId && ptySessions.has(sessionId)) {
    return { sessionId };
  }
  return { sessionId: null };
});

ipcMain.handle("pty:write", async (_event, sessionId: string, data: string) => {
  const ptyProcess = ptySessions.get(sessionId);
  if (ptyProcess) {
    ptyProcess.write(data);
    // Reset idle timeout on activity
    resetPtyIdleTimeout(sessionId);
  }
});

ipcMain.handle(
  "pty:resize",
  async (_event, sessionId: string, cols: number, rows: number) => {
    const ptyProcess = ptySessions.get(sessionId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  },
);

ipcMain.handle("pty:kill", async (_event, sessionId: string) => {
  const ptyProcess = ptySessions.get(sessionId);
  if (ptyProcess) {
    ptyProcess.kill();
    cleanupPtySession(sessionId);
  }
});

// ==================== File System IPC Handlers ====================

// Cache for gitignore patterns per repository
const gitignoreCache = new Map<string, Ignore>();

async function getGitignore(repoPath: string): Promise<Ignore> {
  // Check cache first
  if (gitignoreCache.has(repoPath)) {
    return gitignoreCache.get(repoPath)!;
  }

  const ig = ignore();

  // Load .gitignore from repo root
  const gitignorePath = path.join(repoPath, ".gitignore");
  try {
    if (fs.existsSync(gitignorePath)) {
      const content = await fs.promises.readFile(gitignorePath, "utf-8");
      ig.add(content);
    }
  } catch (err) {
    console.error("Failed to load .gitignore:", err);
  }

  // Always ignore .git directory
  ig.add(".git");

  gitignoreCache.set(repoPath, ig);
  return ig;
}

function isIgnored(
  ig: Ignore,
  repoPath: string,
  filePath: string,
  isDirectory: boolean = false,
): boolean {
  const relativePath = path.relative(repoPath, filePath);
  if (!relativePath) return false;
  // For directories, also check with trailing slash for correct matching
  if (isDirectory) {
    return ig.ignores(relativePath) || ig.ignores(relativePath + "/");
  }
  return ig.ignores(relativePath);
}

interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeEntry[];
  ignored?: boolean;
}

ipcMain.handle(
  "fs:list-directory",
  async (_event, dirPath: string, depth: number = 1) => {
    // Get gitignore for the root path
    const ig = await getGitignore(dirPath);

    const buildTree = async (
      currentPath: string,
      currentDepth: number,
    ): Promise<FileTreeEntry[]> => {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      const result: FileTreeEntry[] = [];

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const isDir = entry.isDirectory();
        const ignored = isIgnored(ig, dirPath, fullPath, isDir);

        // Skip hidden files but show gitignored files (with ignored flag)
        if (entry.name.startsWith(".")) {
          continue;
        }

        if (isDir) {
          const children =
            currentDepth < depth
              ? await buildTree(fullPath, currentDepth + 1)
              : undefined;
          result.push({
            name: entry.name,
            path: fullPath,
            type: "directory",
            children,
            ignored,
          });
        } else {
          result.push({
            name: entry.name,
            path: fullPath,
            type: "file",
            ignored,
          });
        }
      }

      // Sort: directories first, then alphabetically
      return result.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    };

    return buildTree(dirPath, 1);
  },
);

ipcMain.handle("fs:read-file", async (_event, filePath: string) => {
  const content = await fs.promises.readFile(filePath, "utf-8");
  return content;
});

ipcMain.handle(
  "fs:expand-directory",
  async (_event, dirPath: string, rootPath?: string) => {
    // Use rootPath for gitignore, or fall back to dirPath
    const gitignoreRoot = rootPath || dirPath;
    const ig = await getGitignore(gitignoreRoot);

    const entries = await fs.promises.readdir(dirPath, {
      withFileTypes: true,
    });

    return entries
      .filter((e) => !e.name.startsWith("."))
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const isDir = entry.isDirectory();
        return {
          name: entry.name,
          path: fullPath,
          type: isDir ? ("directory" as const) : ("file" as const),
          ignored: isIgnored(ig, gitignoreRoot, fullPath, isDir),
        };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  },
);

// Fuzzy match: checks if pattern chars appear in order in str
// "fb" matches "foobar" (f...b), "abc" matches "a_big_component"
function fuzzyMatch(
  pattern: string,
  str: string,
): { matches: boolean; score: number } {
  const patternLower = pattern.toLowerCase();
  const strLower = str.toLowerCase();

  let patternIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (
    let i = 0;
    i < strLower.length && patternIdx < patternLower.length;
    i++
  ) {
    if (strLower[i] === patternLower[patternIdx]) {
      // Bonus for consecutive matches
      if (lastMatchIdx === i - 1) score += 2;
      // Bonus for match at start or after separator
      if (i === 0 || /[_\-./\\]/.test(str[i - 1])) score += 3;
      score += 1;
      lastMatchIdx = i;
      patternIdx++;
    }
  }

  return {
    matches: patternIdx === patternLower.length,
    score: patternIdx === patternLower.length ? score : 0,
  };
}

// Get all files using system command (fast!)
async function listAllFiles(rootPath: string): Promise<string[]> {
  const isWindows = process.platform === "win32";

  try {
    if (isWindows) {
      // Windows: use dir command
      const { stdout } = await execAsync(`dir /s /b /a:-d`, {
        cwd: rootPath,
        maxBuffer: 50 * 1024 * 1024,
      });
      return stdout.split("\r\n").filter(Boolean);
    } else {
      // macOS/Linux: use find command, exclude hidden and node_modules
      const { stdout } = await execAsync(
        `find . -type f -not -path '*/\\.*' -not -path '*/node_modules/*'`,
        { cwd: rootPath, maxBuffer: 50 * 1024 * 1024 },
      );
      return stdout
        .split("\n")
        .filter(Boolean)
        .map((p) => path.join(rootPath, p.slice(2))); // Remove "./" prefix
    }
  } catch (err) {
    console.error("File listing failed:", err);
    return [];
  }
}

ipcMain.handle(
  "fs:search-files",
  async (
    _event,
    rootPath: string,
    pattern: string,
    limit: number = 100,
  ): Promise<
    Array<{ path: string; name: string; score: number; ignored?: boolean }>
  > => {
    if (!pattern) return [];

    // Get gitignore for the root path
    const ig = await getGitignore(rootPath);

    // Get all files using fast system command
    const allFiles = await listAllFiles(rootPath);

    // Apply fuzzy matching and scoring
    const results: Array<{
      path: string;
      name: string;
      score: number;
      ignored?: boolean;
    }> = [];

    for (const filePath of allFiles) {
      const name = path.basename(filePath);

      // Skip hidden files on Windows (find already excludes on Unix)
      if (name.startsWith(".")) continue;

      const { matches, score } = fuzzyMatch(pattern, name);
      if (matches) {
        const ignored = isIgnored(ig, rootPath, filePath);
        results.push({ path: filePath, name, score, ignored });
      }
    }

    // Sort by score (highest first) and limit
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  },
);

ipcMain.handle(
  "fs:list-all-files",
  async (_event, rootPath: string, limit: number = 10000) => {
    const ig = await getGitignore(rootPath);
    const allFiles = await listAllFiles(rootPath);

    // Filter out git-ignored files and apply limit
    const files: Array<{ path: string; name: string }> = [];
    for (const filePath of allFiles) {
      if (files.length >= limit) break;

      const relativePath = path.relative(rootPath, filePath);
      if (ig.ignores(relativePath)) continue;

      files.push({
        path: relativePath,
        name: path.basename(filePath),
      });
    }

    return files;
  },
);

// ==================== App Info IPC Handlers ====================

ipcMain.handle("app:get-username", () => {
  return os.userInfo().username;
});

ipcMain.handle("app:get-info", async () => {
  // Get Claude CLI version
  let claudeCliVersion = "unknown";
  try {
    const { stdout } = await execAsync("claude --version");
    // Parse version from output like "claude v2.1.29" or "2.1.29"
    const match = stdout.match(/v?(\d+\.\d+\.\d+)/);
    if (match) {
      claudeCliVersion = match[1];
    }
  } catch {
    // CLI not installed or not in PATH
  }

  // Read package.json to get app version info
  const packageJsonPath = path.join(__dirname, "..", "package.json");
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return {
      appVersion: packageJson.version || "unknown",
      claudeCliVersion,
      claudeSdkVersion:
        packageJson.dependencies?.["@anthropic-ai/claude-agent-sdk"] ||
        "unknown",
    };
  } catch {
    return {
      appVersion: app.getVersion() || "unknown",
      claudeCliVersion,
      claudeSdkVersion: "unknown",
    };
  }
});

// Cleanup watchers and PTY sessions on window close
app.on("before-quit", async () => {
  // Clean up file watchers
  for (const [id, watcher] of fileWatchers) {
    try {
      await watcher.close();
    } catch (error) {
      console.error(`Error closing watcher ${id}:`, error);
    }
  }
  fileWatchers.clear();

  // Clean up PTY sessions and their metadata
  for (const [sessionId, ptyProcess] of ptySessions) {
    try {
      // Clear idle timeout
      const meta = ptySessionMetadata.get(sessionId);
      if (meta?.idleTimeoutId) {
        clearTimeout(meta.idleTimeoutId);
      }
      ptyProcess.kill();
    } catch (error) {
      console.error(`Error killing PTY ${sessionId}:`, error);
    }
  }
  ptySessions.clear();
  ptySessionMetadata.clear();
  paneToSessionId.clear();
});
