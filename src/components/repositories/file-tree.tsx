import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  Search,
} from "lucide-react";
import type { FileTreeEntry } from "@/lib/fs";

interface FileTreeProps {
  rootPath: string;
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
}

interface TreeNodeProps {
  entry: FileTreeEntry;
  depth: number;
  selectedFile: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFileSelect: (path: string) => void;
  filterText: string;
}

function matchesFilter(entry: FileTreeEntry, filterText: string): boolean {
  if (!filterText) return true;
  const lowerFilter = filterText.toLowerCase();

  if (entry.name.toLowerCase().includes(lowerFilter)) {
    return true;
  }

  if (entry.type === "directory" && entry.children) {
    return entry.children.some((child) => matchesFilter(child, filterText));
  }

  return false;
}

function TreeNode({
  entry,
  depth,
  selectedFile,
  expandedPaths,
  onToggle,
  onFileSelect,
  filterText,
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(entry.path);
  const isSelected = selectedFile === entry.path;
  const isDirectory = entry.type === "directory";

  if (!matchesFilter(entry, filterText)) {
    return null;
  }

  const handleClick = () => {
    if (isDirectory) {
      onToggle(entry.path);
    } else {
      onFileSelect(entry.path);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50 text-sm",
          isSelected && "bg-muted",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-blue-500" />
            )}
          </>
        ) : (
          <>
            <span className="w-4" />
            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{entry.name}</span>
      </div>

      {isDirectory && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onFileSelect={onFileSelect}
              filterText={filterText}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({
  rootPath,
  selectedFile,
  onFileSelect,
}: FileTreeProps) {
  const [entries, setEntries] = useState<FileTreeEntry[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDirectory() {
      if (!window.fsAPI) {
        setError("File system API not available");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const result = await window.fsAPI.listDirectory(rootPath, 1);
        setEntries(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
      } finally {
        setLoading(false);
      }
    }

    void loadDirectory();
  }, [rootPath]);

  const handleToggle = useCallback(
    async (path: string) => {
      const newExpanded = new Set(expandedPaths);

      if (newExpanded.has(path)) {
        newExpanded.delete(path);
        setExpandedPaths(newExpanded);
      } else {
        newExpanded.add(path);
        setExpandedPaths(newExpanded);

        // Load children if not already loaded
        const findAndUpdateEntry = (
          entries: FileTreeEntry[],
        ): FileTreeEntry[] => {
          return entries.map((entry) => {
            if (entry.path === path && entry.type === "directory") {
              if (!entry.children) {
                // Load children asynchronously
                void window.fsAPI?.expandDirectory(path).then((children) => {
                  setEntries((prev) =>
                    updateEntryChildren(prev, path, children),
                  );
                });
              }
              return entry;
            }
            if (entry.children) {
              return { ...entry, children: findAndUpdateEntry(entry.children) };
            }
            return entry;
          });
        };

        setEntries((prev) => findAndUpdateEntry(prev));
      }
    },
    [expandedPaths],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive text-sm p-4 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter files..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No files found
          </div>
        ) : (
          entries.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              selectedFile={selectedFile}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              onFileSelect={onFileSelect}
              filterText={filterText}
            />
          ))
        )}
      </div>
    </div>
  );
}

function updateEntryChildren(
  entries: FileTreeEntry[],
  targetPath: string,
  children: FileTreeEntry[],
): FileTreeEntry[] {
  return entries.map((entry) => {
    if (entry.path === targetPath) {
      return { ...entry, children };
    }
    if (entry.children) {
      return {
        ...entry,
        children: updateEntryChildren(entry.children, targetPath, children),
      };
    }
    return entry;
  });
}
