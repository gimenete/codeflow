export interface FileTreeEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeEntry[];
}

declare global {
  interface Window {
    fsAPI?: {
      listDirectory: (path: string, depth?: number) => Promise<FileTreeEntry[]>;
      readFile: (path: string) => Promise<string>;
      expandDirectory: (path: string) => Promise<FileTreeEntry[]>;
    };
  }
}
