import { useEffect, useRef, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { FileIcon } from "@react-symbols/icons/utils";
import { cn } from "@/lib/utils";
import { useFileSearch } from "@/hooks/use-file-search";
import { HighlightedText } from "@/lib/fuzzy-search";

interface FileAutocompleteProps {
  cwd: string;
  searchText: string;
  onSelect: (filePath: string) => void;
  onClose: () => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}

export function FileAutocomplete({
  cwd,
  searchText,
  onSelect,
  onClose,
  selectedIndex,
  onSelectedIndexChange,
}: FileAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Use shared file search hook with caching
  const { search, isLoading } = useFileSearch({ rootPath: cwd });

  // Memoize search results
  const results = useMemo(() => search(searchText, 15), [search, searchText]);

  // Clamp selected index to results length
  useEffect(() => {
    if (results.length > 0 && selectedIndex >= results.length) {
      onSelectedIndexChange(results.length - 1);
    }
  }, [results.length, selectedIndex, onSelectedIndexChange]);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Handle Enter key to select highlighted file
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Enter" && !event.shiftKey && results.length > 0) {
        event.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          onSelect(selected.relativePath);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [results, selectedIndex, onSelect]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-1 rounded-md border bg-popover shadow-md z-50 overflow-hidden"
    >
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        Files
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : results.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            {searchText ? "No files found" : "Type to search files..."}
          </div>
        ) : (
          results.map((result, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={result.path}
                ref={isSelected ? selectedRef : undefined}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/50",
                )}
                onClick={() => onSelect(result.relativePath)}
              >
                <FileIcon
                  fileName={result.name}
                  autoAssign
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                />
                <div className="flex flex-col min-w-0">
                  <HighlightedText
                    text={result.name}
                    matchIndices={result.matches ?? []}
                    className="font-medium truncate"
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {result.relativePath}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
