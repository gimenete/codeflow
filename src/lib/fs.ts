export interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeEntry[];
  ignored?: boolean;
}

export interface SearchResult {
  path: string;
  name: string;
  score: number;
  ignored?: boolean;
  matches?: number[];
}

export interface FileEntry {
  path: string;
  name: string;
}

declare global {
  interface Window {
    fsAPI?: {
      listDirectory: (path: string, depth?: number) => Promise<FileTreeEntry[]>;
      readFile: (path: string) => Promise<string>;
      expandDirectory: (
        path: string,
        rootPath?: string,
      ) => Promise<FileTreeEntry[]>;
      searchFiles: (
        rootPath: string,
        pattern: string,
        limit?: number,
      ) => Promise<SearchResult[]>;
      listAllFiles: (rootPath: string, limit?: number) => Promise<FileEntry[]>;
    };
  }
}
