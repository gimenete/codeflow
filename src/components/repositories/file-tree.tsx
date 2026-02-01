import {
  useEffect,
  useState,
  useCallback,
  useDeferredValue,
  memo,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyIcon,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  ChevronRight,
  ChevronDown,
  Search,
  SearchX,
  Loader2,
} from "lucide-react";
import {
  FileIcon,
  FolderIcon,
  DefaultFolderOpenedIcon,
} from "@react-symbols/icons/utils";
import type { FileTreeEntry, SearchResult } from "@/lib/fs";

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
  parentIgnored?: boolean;
}

// Highlight fuzzy matching characters in a name (consecutive matches are unified)
function HighlightedName({ name, pattern }: { name: string; pattern: string }) {
  if (!pattern) {
    return <span className="truncate">{name}</span>;
  }

  // Find all match indices
  const matchIndices: number[] = [];
  let patternIdx = 0;
  const patternLower = pattern.toLowerCase();
  const nameLower = name.toLowerCase();

  for (let i = 0; i < name.length && patternIdx < patternLower.length; i++) {
    if (nameLower[i] === patternLower[patternIdx]) {
      matchIndices.push(i);
      patternIdx++;
    }
  }

  // Build result with consecutive matches unified
  const result: React.ReactNode[] = [];
  let i = 0;
  let matchIdx = 0;

  while (i < name.length) {
    if (matchIdx < matchIndices.length && i === matchIndices[matchIdx]) {
      // Start of a match sequence - find consecutive matches
      let end = i;
      while (
        matchIdx < matchIndices.length - 1 &&
        matchIndices[matchIdx + 1] === end + 1
      ) {
        matchIdx++;
        end++;
      }
      // Add the unified highlight span
      result.push(
        <span key={i} className="bg-yellow-300 dark:bg-yellow-700 rounded-sm">
          {name.slice(i, end + 1)}
        </span>,
      );
      matchIdx++;
      i = end + 1;
    } else {
      // Non-matching character - collect consecutive non-matches
      const start = i;
      while (
        i < name.length &&
        (matchIdx >= matchIndices.length || i !== matchIndices[matchIdx])
      ) {
        i++;
      }
      result.push(name.slice(start, i));
    }
  }

  return <span className="truncate">{result}</span>;
}

const TreeNode = memo(function TreeNode({
  entry,
  depth,
  selectedFile,
  expandedPaths,
  onToggle,
  onFileSelect,
  parentIgnored,
}: TreeNodeProps) {
  const isExpanded = expandedPaths.has(entry.path);
  const isSelected = selectedFile === entry.path;
  const isDirectory = entry.type === "directory";
  // Entry is ignored if it's marked as ignored or if its parent is ignored
  const isIgnored = entry.ignored || parentIgnored;

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
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0",
                  isIgnored
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground",
                )}
              />
            ) : (
              <ChevronRight
                className={cn(
                  "h-4 w-4 shrink-0",
                  isIgnored
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground",
                )}
              />
            )}
            <span className={cn("shrink-0", isIgnored && "opacity-50")}>
              {isExpanded ? (
                <DefaultFolderOpenedIcon className="h-4 w-4" />
              ) : (
                <FolderIcon folderName={entry.name} className="h-4 w-4" />
              )}
            </span>
          </>
        ) : (
          <>
            <span className="w-4" />
            <span className={cn("shrink-0", isIgnored && "opacity-50")}>
              <FileIcon fileName={entry.name} autoAssign className="h-4 w-4" />
            </span>
          </>
        )}
        <span
          className={cn("truncate", isIgnored && "text-muted-foreground/50")}
        >
          {entry.name}
        </span>
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
              parentIgnored={isIgnored}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Component for displaying search results
interface SearchResultItemProps {
  result: SearchResult;
  pattern: string;
  rootPath: string;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: (path: string) => void;
}

function SearchResultItem({
  result,
  pattern,
  rootPath,
  isSelected,
  isFocused,
  onSelect,
}: SearchResultItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [isFocused]);

  // Get relative path from root
  const relativePath = result.path.startsWith(rootPath)
    ? result.path.slice(rootPath.length + 1)
    : result.path;
  const dirPath = relativePath.includes("/")
    ? relativePath.slice(0, relativePath.lastIndexOf("/"))
    : "";

  return (
    <div
      ref={itemRef}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/50 text-sm",
        isSelected && "bg-muted",
        isFocused && "bg-accent",
      )}
      onClick={() => onSelect(result.path)}
    >
      <span className={cn("shrink-0", result.ignored && "opacity-50")}>
        <FileIcon fileName={result.name} autoAssign className="h-4 w-4" />
      </span>
      <div className="flex flex-col min-w-0 flex-1">
        <span className={cn(result.ignored && "text-muted-foreground/50")}>
          <HighlightedName name={result.name} pattern={pattern} />
        </span>
        {dirPath && (
          <span
            className={cn(
              "text-xs truncate",
              result.ignored
                ? "text-muted-foreground/40"
                : "text-muted-foreground",
            )}
          >
            {dirPath}
          </span>
        )}
      </div>
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

  // Fuzzy search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const deferredFilter = useDeferredValue(filterText);

  // Search effect - DON'T clear results while loading (keep previous results visible)
  useEffect(() => {
    if (!deferredFilter) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    void window.fsAPI
      ?.searchFiles(rootPath, deferredFilter, 50)
      .then((results) => {
        if (!cancelled) {
          setSearchResults(results);
          setSearching(false);
          setFocusedIndex(0); // Reset focus when results change
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deferredFilter, rootPath]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!filterText || searchResults.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          if (searchResults[focusedIndex]) {
            onFileSelect(searchResults[focusedIndex].path);
          }
          break;
      }
    },
    [filterText, searchResults, focusedIndex, onFileSelect],
  );

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
                // Load children asynchronously, passing rootPath for gitignore
                void window.fsAPI
                  ?.expandDirectory(path, rootPath)
                  .then((children) => {
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
    [expandedPaths, rootPath],
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
            onKeyDown={handleKeyDown}
            className="pl-8 pr-8 h-8 text-sm"
          />
          {searching && (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filterText ? (
          // Show search results when filtering
          searchResults.length > 0 ? (
            searchResults.map((result, index) => (
              <SearchResultItem
                key={result.path}
                result={result}
                pattern={deferredFilter}
                rootPath={rootPath}
                isSelected={selectedFile === result.path}
                isFocused={index === focusedIndex}
                onSelect={onFileSelect}
              />
            ))
          ) : !searching ? (
            <Empty className="h-full">
              <EmptyIcon>
                <SearchX />
              </EmptyIcon>
              <EmptyTitle>No matching files</EmptyTitle>
              <EmptyDescription>
                No files match &quot;{filterText}&quot;
              </EmptyDescription>
            </Empty>
          ) : null
        ) : entries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            No files found
          </div>
        ) : (
          // Show tree view when not filtering
          entries.map((entry) => (
            <TreeNode
              key={entry.path}
              entry={entry}
              depth={0}
              selectedFile={selectedFile}
              expandedPaths={expandedPaths}
              onToggle={handleToggle}
              onFileSelect={onFileSelect}
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
