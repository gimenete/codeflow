import {
  useEffect,
  useState,
  useCallback,
  useDeferredValue,
  memo,
  useRef,
  useMemo,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
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
  X,
} from "lucide-react";
import {
  FileIcon,
  FolderIcon,
  DefaultFolderOpenedIcon,
} from "@react-symbols/icons/utils";
import type { FileTreeEntry, SearchResult } from "@/lib/fs";

// Fuzzy match: checks if pattern chars appear in order in str
// Returns match indices and a score, or null if no match
function fuzzyMatch(
  pattern: string,
  text: string,
): { matches: number[]; score: number } | null {
  const lowerPattern = pattern.toLowerCase();
  const lowerText = text.toLowerCase();
  const matches: number[] = [];
  let patternIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (
    let i = 0;
    i < lowerText.length && patternIdx < lowerPattern.length;
    i++
  ) {
    if (lowerText[i] === lowerPattern[patternIdx]) {
      matches.push(i);
      // Score: bonus for start, after separator, or consecutive
      if (i === 0 || "/\\-_.".includes(text[i - 1])) {
        score += 3;
      } else if (lastMatchIdx === i - 1) {
        score += 2;
      } else {
        score += 1;
      }
      lastMatchIdx = i;
      patternIdx++;
    }
  }

  return patternIdx === lowerPattern.length ? { matches, score } : null;
}

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
  shouldScrollToSelected?: boolean;
  onScrollComplete?: () => void;
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
  shouldScrollToSelected,
  onScrollComplete,
}: TreeNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const isExpanded = expandedPaths.has(entry.path);
  const isSelected = selectedFile === entry.path;
  const isDirectory = entry.type === "directory";
  // Entry is ignored if it's marked as ignored or if its parent is ignored
  const isIgnored = entry.ignored || parentIgnored;

  // Scroll into view when selected and scroll is requested
  useEffect(() => {
    if (isSelected && shouldScrollToSelected && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: "nearest" });
      onScrollComplete?.();
    }
  }, [isSelected, shouldScrollToSelected, onScrollComplete]);

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
        ref={nodeRef}
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
              shouldScrollToSelected={shouldScrollToSelected}
              onScrollComplete={onScrollComplete}
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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const deferredFilter = useDeferredValue(filterText);
  const [shouldScrollToSelected, setShouldScrollToSelected] = useState(false);

  // Load all files upfront with React Query (cached)
  const { data: allFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ["all-files", rootPath],
    queryFn: () =>
      window.fsAPI?.listAllFiles(rootPath, 10000) ?? Promise.resolve([]),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!rootPath,
  });

  // In-memory fuzzy search (instant, no IPC per keystroke)
  const searchResults = useMemo((): SearchResult[] => {
    if (!deferredFilter.trim()) {
      return [];
    }

    const pattern = deferredFilter.trim();
    const results: SearchResult[] = [];

    for (const file of allFiles) {
      const match = fuzzyMatch(pattern, file.name);
      if (match) {
        // Construct full path from rootPath and relative path
        const fullPath = `${rootPath}/${file.path}`;
        results.push({
          path: fullPath,
          name: file.name,
          score: match.score,
          matches: match.matches,
        });
      }
    }

    // Sort by score descending, limit to 50
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
  }, [deferredFilter, allFiles, rootPath]);

  // Reset focus when filter changes
  useEffect(() => {
    setFocusedIndex(0);
  }, [deferredFilter]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && filterText) {
        e.preventDefault();
        setFilterText("");
        return;
      }

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

  // Helper function to get all parent paths for a file
  const getParentPaths = useCallback(
    (filePath: string): string[] => {
      const parents: string[] = [];
      let currentPath = rootPath;

      const relativePath = filePath.startsWith(rootPath + "/")
        ? filePath.slice(rootPath.length + 1)
        : filePath;

      const parts = relativePath.split("/");
      // Exclude the filename (last part)
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = `${currentPath}/${parts[i]}`;
        parents.push(currentPath);
      }

      return parents;
    },
    [rootPath],
  );

  // Expand a directory and load its children if needed
  const expandDirectory = useCallback(
    async (path: string) => {
      // Add to expanded paths
      setExpandedPaths((prev) => new Set([...prev, path]));

      // Check if children need to be loaded by looking at current entries
      const findEntry = (
        entries: FileTreeEntry[],
        targetPath: string,
      ): FileTreeEntry | null => {
        for (const entry of entries) {
          if (entry.path === targetPath) return entry;
          if (entry.children) {
            const found = findEntry(entry.children, targetPath);
            if (found) return found;
          }
        }
        return null;
      };

      // We need to check current entries and load children if needed
      setEntries((currentEntries) => {
        const entry = findEntry(currentEntries, path);
        if (entry && entry.type === "directory" && !entry.children) {
          // Load children asynchronously
          void window.fsAPI
            ?.expandDirectory(path, rootPath)
            .then((children) => {
              setEntries((prev) => updateEntryChildren(prev, path, children));
            });
        }
        return currentEntries;
      });
    },
    [rootPath],
  );

  // Handle clear button click
  const handleClear = useCallback(async () => {
    setFilterText("");

    if (selectedFile) {
      // Expand all parent directories of the selected file
      const parentPaths = getParentPaths(selectedFile);

      // Expand each parent directory (this will also load their children)
      for (const parentPath of parentPaths) {
        await expandDirectory(parentPath);
      }

      // Small delay to allow React to render the expanded tree
      setTimeout(() => {
        setShouldScrollToSelected(true);
      }, 50);
    }
  }, [selectedFile, getParentPaths, expandDirectory]);

  // Callback when scroll completes
  const handleScrollComplete = useCallback(() => {
    setShouldScrollToSelected(false);
  }, []);

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
        <InputGroup className="h-8">
          <InputGroupAddon align="inline-start">
            <Search className="h-4 w-4" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            placeholder="Filter files..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-sm"
          />
          {filesLoading && filterText ? (
            <InputGroupAddon align="inline-end">
              <Loader2 className="h-4 w-4 animate-spin" />
            </InputGroupAddon>
          ) : filterText ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" onClick={handleClear}>
                <X className="h-4 w-4" />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
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
          ) : !filesLoading ? (
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
              shouldScrollToSelected={shouldScrollToSelected}
              onScrollComplete={handleScrollComplete}
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
