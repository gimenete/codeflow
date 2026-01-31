import { useState, useEffect, useCallback } from "react";
import { isElectron } from "./platform";
import type { LocalRepository, GitStatus, GitCommit } from "./github-types";

const REPOS_KEY = "codeflow:local-repositories";

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

let repositoriesCache: LocalRepository[] | null = null;

function loadRepositories(): LocalRepository[] {
  if (repositoriesCache !== null) {
    return repositoriesCache;
  }

  const data = localStorage.getItem(REPOS_KEY);
  repositoriesCache = data ? JSON.parse(data) : [];
  return repositoriesCache ?? [];
}

function saveRepositories(repos: LocalRepository[]): void {
  localStorage.setItem(REPOS_KEY, JSON.stringify(repos));
  repositoriesCache = repos;
  notifyListeners();
}

export function getRepository(id: string): LocalRepository | null {
  const repos = loadRepositories();
  return repos.find((r) => r.id === id) ?? null;
}

export function useLocalRepositories() {
  const [repositories, setRepositories] = useState<LocalRepository[]>([]);

  useEffect(() => {
    setRepositories(loadRepositories());

    const listener = () => {
      setRepositories(loadRepositories());
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return { repositories };
}

export function useRepository(id: string) {
  const { repositories } = useLocalRepositories();
  return repositories.find((r) => r.id === id) ?? null;
}

export function useAddRepository() {
  const addRepository = useCallback(async (path: string, name?: string) => {
    const repos = loadRepositories();
    const id = btoa(path).replace(/[^a-zA-Z0-9]/g, "");
    const repoName = name ?? path.split("/").pop() ?? path;

    const existing = repos.find((r) => r.path === path);
    if (existing) {
      return existing;
    }

    const newRepo: LocalRepository = { id, name: repoName, path };
    repos.push(newRepo);
    saveRepositories(repos);

    return newRepo;
  }, []);

  return { addRepository };
}

export function useRemoveRepository() {
  const removeRepository = useCallback((id: string) => {
    const repos = loadRepositories();
    const filtered = repos.filter((r) => r.id !== id);
    saveRepositories(filtered);
  }, []);

  return { removeRepository };
}

export function useAddRepositoryDialog() {
  const [isOpen, setOpen] = useState(false);
  return { isOpen, setOpen };
}

// Type definitions for the Git API exposed by Electron preload
interface GitAPI {
  getCurrentBranch(path: string): Promise<string>;
  getBranches(path: string): Promise<string[]>;
  getStatus(path: string): Promise<GitStatus>;
  getLog(path: string, branch: string, limit: number): Promise<GitCommit[]>;
  getDiffFile(path: string, file: string): Promise<string>;
  getDiffStaged(path: string, file: string): Promise<string>;
  getDiffHead(path: string, file: string): Promise<string>;
  stage(
    path: string,
    file: string,
  ): Promise<{ success: boolean; error?: string }>;
  unstage(
    path: string,
    file: string,
  ): Promise<{ success: boolean; error?: string }>;
  discard(
    path: string,
    file: string,
  ): Promise<{ success: boolean; error?: string }>;
  stageHunk(
    path: string,
    patch: string,
  ): Promise<{ success: boolean; error?: string }>;
  unstageHunk(
    path: string,
    patch: string,
  ): Promise<{ success: boolean; error?: string }>;
  discardHunk(
    path: string,
    patch: string,
  ): Promise<{ success: boolean; error?: string }>;
  getCommitDetail(
    path: string,
    sha: string,
  ): Promise<{
    commit: GitCommit;
    files: Array<{ path: string; status: string; diff: string }>;
  }>;
  commit(path: string, files: string[], message: string): Promise<string>;
  getRemoteUrl(path: string, remote: string): Promise<string>;
  fetch(
    path: string,
    remote: string,
  ): Promise<{ success: boolean; error?: string }>;
  pull(
    path: string,
    remote: string,
    branch: string,
  ): Promise<{ success: boolean; error?: string }>;
  push(
    path: string,
    remote: string,
    branch: string,
    force: boolean,
  ): Promise<{ success: boolean; error?: string }>;
  createBranch(
    path: string,
    branchName: string,
    checkout: boolean,
  ): Promise<{ success: boolean; error?: string }>;
  checkout(
    path: string,
    branch: string,
  ): Promise<{ success: boolean; error?: string }>;
  deleteBranch(
    path: string,
    branch: string,
    force: boolean,
  ): Promise<{ success: boolean; error?: string }>;
  parseRemoteUrl(
    path: string,
    remoteName?: string,
  ): Promise<{
    owner: string | null;
    repo: string | null;
    host: string | null;
  }>;
  getDiffBase(path: string, baseBranch?: string): Promise<string>;
}

interface DialogAPI {
  openFolder(): Promise<string | null>;
}

interface WatcherChangeEvent {
  id: string;
  event: string;
  path: string;
}

interface WatcherAPI {
  start(
    watcherId: string,
    watchPath: string,
  ): Promise<{ success: boolean; error?: string }>;
  stop(watcherId: string): Promise<{ success: boolean; error?: string }>;
  onChange(callback: (event: WatcherChangeEvent) => void): void;
  removeAllListeners(): void;
}

declare global {
  interface Window {
    gitAPI?: GitAPI;
    dialogAPI?: DialogAPI;
    watcherAPI?: WatcherAPI;
  }
}

export async function getCurrentBranch(path: string): Promise<string> {
  if (!isElectron() || !window.gitAPI) {
    return "main";
  }

  try {
    return await window.gitAPI.getCurrentBranch(path);
  } catch {
    return "main";
  }
}

export function useBranches(path: string | undefined) {
  const [branches, setBranches] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("main");

  useEffect(() => {
    if (!path || !isElectron() || !window.gitAPI) {
      setBranches(["main"]);
      setCurrentBranch("main");
      return;
    }

    async function fetchBranches() {
      try {
        const branchList = await window.gitAPI!.getBranches(path!);
        const current = await window.gitAPI!.getCurrentBranch(path!);
        setBranches(branchList);
        setCurrentBranch(current);
      } catch {
        setBranches(["main"]);
        setCurrentBranch("main");
      }
    }

    void fetchBranches();
  }, [path]);

  return { branches, currentBranch };
}

export function useGitStatus(path: string | undefined) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!path || !isElectron() || !window.gitAPI) {
      setStatus({
        branch: "main",
        ahead: 0,
        behind: 0,
        stagedFiles: [],
        unstagedFiles: [],
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.gitAPI.getStatus(path);
      setStatus(result);
    } catch (error) {
      console.error("Failed to get git status:", error);
      setStatus({
        branch: "main",
        ahead: 0,
        behind: 0,
        stagedFiles: [],
        unstagedFiles: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { status, isLoading, refresh };
}

export function useGitLog(path: string | undefined, branch: string) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!path || !isElectron() || !window.gitAPI) {
      setCommits([]);
      return;
    }

    async function fetchLog() {
      setIsLoading(true);
      try {
        const result = await window.gitAPI!.getLog(path!, branch, 100);
        setCommits(result);
      } catch (error) {
        console.error("Failed to get git log:", error);
        setCommits([]);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchLog();
  }, [path, branch]);

  return { commits, isLoading };
}

export function useFileDiff(path: string | undefined, file: string | null) {
  const [diff, setDiff] = useState<string>("");

  useEffect(() => {
    if (!path || !file || !isElectron() || !window.gitAPI) {
      setDiff("");
      return;
    }

    async function fetchDiff() {
      try {
        const result = await window.gitAPI!.getDiffFile(path!, file!);
        setDiff(result);
      } catch (error) {
        console.error("Failed to get diff:", error);
        setDiff("");
      }
    }

    void fetchDiff();
  }, [path, file]);

  return { diff };
}

export function useCommitDetail(path: string | undefined, sha: string) {
  const [commit, setCommit] = useState<GitCommit | null>(null);
  const [files, setFiles] = useState<
    Array<{ path: string; status: string; diff: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!path || !sha || !isElectron() || !window.gitAPI) {
      setCommit(null);
      setFiles([]);
      return;
    }

    async function fetchCommit() {
      setIsLoading(true);
      try {
        const result = await window.gitAPI!.getCommitDetail(path!, sha);
        setCommit(result.commit);
        setFiles(result.files);
      } catch (error) {
        console.error("Failed to get commit detail:", error);
        setCommit(null);
        setFiles([]);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchCommit();
  }, [path, sha]);

  return { commit, files, isLoading };
}

export async function commitChanges(
  path: string,
  files: string[],
  message: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.gitAPI) {
    return { success: false, error: "Not available in web mode" };
  }

  try {
    const fullMessage = description ? `${message}\n\n${description}` : message;
    await window.gitAPI.commit(path, files, fullMessage);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function openFolderPicker(): Promise<string | null> {
  if (!isElectron() || !window.dialogAPI) {
    return null;
  }

  try {
    return await window.dialogAPI.openFolder();
  } catch {
    return null;
  }
}

export async function gitFetch(
  path: string,
  remote: string = "origin",
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.gitAPI) {
    return { success: false, error: "Not available in web mode" };
  }

  try {
    return await window.gitAPI.fetch(path, remote);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function gitPull(
  path: string,
  remote: string,
  branch: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.gitAPI) {
    return { success: false, error: "Not available in web mode" };
  }

  try {
    return await window.gitAPI.pull(path, remote, branch);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function gitPush(
  path: string,
  remote: string,
  branch: string,
  force: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.gitAPI) {
    return { success: false, error: "Not available in web mode" };
  }

  try {
    return await window.gitAPI.push(path, remote, branch, force);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getRemoteUrl(
  path: string,
  remote: string = "origin",
): Promise<string | null> {
  if (!isElectron() || !window.gitAPI) {
    return null;
  }

  try {
    return await window.gitAPI.getRemoteUrl(path, remote);
  } catch {
    return null;
  }
}

export async function createBranch(
  path: string,
  name: string,
  checkout: boolean = true,
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.gitAPI) {
    return { success: false, error: "Not available in web mode" };
  }

  try {
    return await window.gitAPI.createBranch(path, name, checkout);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkoutBranch(
  path: string,
  branch: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.gitAPI) {
    return { success: false, error: "Not available in web mode" };
  }

  try {
    return await window.gitAPI.checkout(path, branch);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function deleteBranch(
  path: string,
  branch: string,
  force: boolean = false,
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.gitAPI) {
    return { success: false, error: "Not available in web mode" };
  }

  try {
    return await window.gitAPI.deleteBranch(path, branch, force);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function parseRemoteUrl(
  path: string,
  remoteName: string = "origin",
): Promise<{ owner: string | null; repo: string | null; host: string | null }> {
  if (!isElectron() || !window.gitAPI) {
    return { owner: null, repo: null, host: null };
  }

  try {
    return await window.gitAPI.parseRemoteUrl(path, remoteName);
  } catch {
    return { owner: null, repo: null, host: null };
  }
}

export async function getDiffBase(
  path: string,
  baseBranch: string = "main",
): Promise<string> {
  if (!isElectron() || !window.gitAPI) {
    return "";
  }

  try {
    return await window.gitAPI.getDiffBase(path, baseBranch);
  } catch {
    return "";
  }
}

// File watcher utilities
export function startWatcher(
  watcherId: string,
  watchPath: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.watcherAPI) {
    return Promise.resolve({
      success: false,
      error: "Not available in web mode",
    });
  }

  return window.watcherAPI.start(watcherId, watchPath);
}

export function stopWatcher(
  watcherId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isElectron() || !window.watcherAPI) {
    return Promise.resolve({
      success: false,
      error: "Not available in web mode",
    });
  }

  return window.watcherAPI.stop(watcherId);
}

export function onWatcherChange(
  callback: (event: WatcherChangeEvent) => void,
): void {
  if (!isElectron() || !window.watcherAPI) {
    return;
  }

  window.watcherAPI.onChange(callback);
}

export function removeWatcherListeners(): void {
  if (!isElectron() || !window.watcherAPI) {
    return;
  }

  window.watcherAPI.removeAllListeners();
}
