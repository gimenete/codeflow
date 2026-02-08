import { File } from "@pierre/diffs/react";
import { getFiletypeFromFileName, type SelectedLineRange } from "@pierre/diffs";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
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
import { Button } from "@/components/ui/button";
import { FileActionsDropdown } from "@/components/file-actions-dropdown";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RequestChangesDialog } from "@/components/request-changes-dialog";
import {
  useLineSelection,
  formatLineReference,
} from "@/lib/use-line-selection";
import { useClaudeStore } from "@/lib/claude-store";
import { FileTree } from "./file-tree";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useDiffTheme } from "@/lib/use-diff-theme";
import type { TrackedBranch } from "@/lib/github-types";
import {
  Search,
  ChevronUp,
  ChevronDown,
  X,
  FileCode,
  MessageSquarePlus,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useNavigate } from "@tanstack/react-router";
import "@/lib/fs";

interface SearchMatch {
  lineNumber: number; // 1-based
  startIndex: number; // Character offset in line
  length: number;
}

interface BranchCodeViewProps {
  branch: TrackedBranch;
  repositoryPath: string;
}

export function BranchCodeView({ repositoryPath }: BranchCodeViewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [contextMenuDialogOpen, setContextMenuDialogOpen] = useState(false);
  const theme = useDiffTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileViewerRef = useRef<HTMLDivElement>(null);

  // Line selection state
  const lineSelection = useLineSelection({
    filePath: selectedFile ?? "",
    containerRef: fileViewerRef,
    enabled: !searchQuery, // Disable line selection when searching
  });

  // Claude store for appending to prompt
  const appendToPrompt = useClaudeStore((s) => s.appendToPrompt);
  const requestInputFocus = useClaudeStore((s) => s.requestInputFocus);
  const location = useLocation();
  const navigate = useNavigate();

  const navigateToAgentTab = useCallback(() => {
    const pathParts = location.pathname.split("/");
    const branchesIndex = pathParts.indexOf("branches");
    if (branchesIndex !== -1 && branchesIndex + 1 < pathParts.length) {
      const basePath = pathParts.slice(0, branchesIndex + 2).join("/");
      requestInputFocus();
      void navigate({ to: `${basePath}/agent` });
    }
  }, [location.pathname, navigate, requestInputFocus]);

  // Get the relative file path for display and chat references
  const relativeFilePath = useMemo(() => {
    if (!selectedFile) return "";
    return selectedFile.startsWith(repositoryPath)
      ? selectedFile.slice(repositoryPath.length + 1)
      : selectedFile;
  }, [selectedFile, repositoryPath]);

  // Handle context menu request changes
  const handleContextMenuRequestChanges = useCallback(
    (instructions: string) => {
      if (!lineSelection.selectedRange) return;
      const reference = formatLineReference(
        relativeFilePath,
        lineSelection.selectedRange,
      );
      appendToPrompt(`${reference} ${instructions}`);
      toast.success("Change request added to chat", {
        action: {
          label: "Go to chat",
          onClick: navigateToAgentTab,
        },
        duration: 3000,
      });
      lineSelection.clearSelection();
    },
    [relativeFilePath, lineSelection, appendToPrompt, navigateToAgentTab],
  );

  // Compute matches when query or content changes
  const searchResults = useMemo(() => {
    if (!searchQuery || !fileContent) return [];

    const matches: SearchMatch[] = [];
    const lines = fileContent.split("\n");
    const queryLower = searchQuery.toLowerCase();

    lines.forEach((line, idx) => {
      let searchStart = 0;
      const lineLower = line.toLowerCase();
      while (true) {
        const pos = lineLower.indexOf(queryLower, searchStart);
        if (pos === -1) break;
        matches.push({
          lineNumber: idx + 1,
          startIndex: pos,
          length: searchQuery.length,
        });
        searchStart = pos + 1;
      }
    });

    return matches;
  }, [searchQuery, fileContent]);

  // Scroll to current match when it changes
  useEffect(() => {
    if (currentMatchIndex < 0 || !searchResults[currentMatchIndex]) return;

    const lineNumber = searchResults[currentMatchIndex].lineNumber;

    // The @pierre/diffs library uses Shadow DOM, so we need to query inside it
    const shadowHost = fileViewerRef.current?.querySelector("diffs-container");
    const shadowRoot = shadowHost?.shadowRoot;
    const lineElement = shadowRoot?.querySelector(
      `[data-line="${lineNumber}"]`,
    ) as HTMLElement | null;

    if (lineElement && fileViewerRef.current) {
      // Get the line position relative to the scroll container
      const containerRect = fileViewerRef.current.getBoundingClientRect();
      const lineRect = lineElement.getBoundingClientRect();

      // Calculate how much to scroll to center the line
      const lineCenter = lineRect.top + lineRect.height / 2;
      const containerCenter = containerRect.top + containerRect.height / 2;
      const scrollOffset = lineCenter - containerCenter;

      fileViewerRef.current.scrollBy({
        top: scrollOffset,
        behavior: "smooth",
      });
    }
  }, [currentMatchIndex, searchResults]);

  // Handle Cmd+F / Ctrl+F to focus search input
  useEffect(() => {
    if (!selectedFile || fileContent === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, fileContent]);

  const handleFileSelect = useCallback(
    async (filePath: string) => {
      setSelectedFile(filePath);
      setFileContent(null);
      setFileError(null);
      setSearchQuery("");
      setCurrentMatchIndex(0);
      lineSelection.clearSelection();

      if (!window.fsAPI) {
        setFileError("File system API not available");
        return;
      }

      try {
        setLoadingFile(true);
        const content = await window.fsAPI.readFile(filePath);
        setFileContent(content);
      } catch (err) {
        setFileError(
          err instanceof Error ? err.message : "Failed to read file",
        );
      } finally {
        setLoadingFile(false);
      }
    },
    [lineSelection],
  );

  const goToNextMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % searchResults.length);
  }, [searchResults.length]);

  const goToPreviousMatch = useCallback(() => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex((prev) =>
      prev === 0 ? searchResults.length - 1 : prev - 1,
    );
  }, [searchResults.length]);

  // Selected lines: search highlight takes priority over manual line selection
  const selectedLines: SelectedLineRange | null = useMemo(() => {
    // If searching, use search highlight
    if (
      searchQuery &&
      currentMatchIndex >= 0 &&
      searchResults[currentMatchIndex]
    ) {
      return {
        start: searchResults[currentMatchIndex].lineNumber,
        end: searchResults[currentMatchIndex].lineNumber,
      };
    }
    // Otherwise, use manual line selection
    return lineSelection.selectedRange;
  }, [
    searchQuery,
    currentMatchIndex,
    searchResults,
    lineSelection.selectedRange,
  ]);

  // Generate CSS for all matching lines (subtle highlight)
  const searchHighlightCSS = useMemo(() => {
    if (searchResults.length === 0) return "";

    const uniqueLines = [...new Set(searchResults.map((m) => m.lineNumber))];
    const currentLine = selectedLines?.start;

    // Create selectors for all matching lines except the currently selected one
    const selectors = uniqueLines
      .filter((lineNumber) => lineNumber !== currentLine)
      .map((lineNumber) => `[data-line="${lineNumber}"]`)
      .join(",\n");

    if (!selectors) return "";

    return `
      ${selectors} {
        [data-column-content] {
          background-color: light-dark(
            rgba(234, 179, 8, 0.15),
            rgba(234, 179, 8, 0.2)
          );
        }
        [data-column-number] {
          background-color: light-dark(
            rgba(234, 179, 8, 0.2),
            rgba(234, 179, 8, 0.25)
          );
        }
      }
    `;
  }, [searchResults, selectedLines?.start]);

  // Handle line selection from the library
  const handleLineSelected = useCallback(
    (range: SelectedLineRange | null) => {
      if (range) {
        lineSelection.handleLineSelected({
          start: range.start,
          end: range.end,
        });
      } else {
        lineSelection.clearSelection();
      }
    },
    [lineSelection],
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full min-h-0">
      <ResizablePanel defaultSize={250} minSize={200} maxSize={500}>
        <FileTree
          rootPath={repositoryPath}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
        />
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel minSize={300}>
        <div className="flex flex-col h-full">
          {selectedFile ? (
            <>
              {fileContent !== null && (
                <div className="flex items-center gap-2 p-2 border-b">
                  <InputGroup className="h-8 flex-1 max-w-xs">
                    <InputGroupAddon align="inline-start">
                      <Search className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search in file..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentMatchIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Escape" && searchQuery) {
                          e.preventDefault();
                          setSearchQuery("");
                          setCurrentMatchIndex(0);
                        } else if (e.key === "Enter") {
                          e.preventDefault();
                          if (e.shiftKey) {
                            goToPreviousMatch();
                          } else {
                            goToNextMatch();
                          }
                        }
                      }}
                      className="text-sm"
                    />
                    {searchQuery && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          onClick={() => setSearchQuery("")}
                        >
                          <X className="h-4 w-4" />
                        </InputGroupButton>
                      </InputGroupAddon>
                    )}
                  </InputGroup>

                  {searchQuery && (
                    <>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {searchResults.length > 0
                          ? `${currentMatchIndex + 1}/${searchResults.length}`
                          : "No results"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={goToPreviousMatch}
                        disabled={searchResults.length === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={goToNextMatch}
                        disabled={searchResults.length === 0}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <FileActionsDropdown filePath={relativeFilePath} />
                </div>
              )}
              <div ref={fileViewerRef} className="flex-1 min-h-0 overflow-auto">
                {loadingFile ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Loading file...
                  </div>
                ) : fileError ? (
                  <div className="flex h-full items-center justify-center text-destructive p-4 text-center">
                    {fileError}
                  </div>
                ) : fileContent !== null ? (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div className="h-full">
                        <File
                          file={{
                            name: relativeFilePath,
                            contents: fileContent,
                            lang: getFiletypeFromFileName(relativeFilePath),
                          }}
                          options={{
                            themeType: theme,
                            overflow: "scroll",
                            unsafeCSS: searchHighlightCSS,
                            enableLineSelection: !searchQuery,
                            onLineSelected: handleLineSelected,
                          }}
                          selectedLines={selectedLines}
                          className="font-mono text-xs"
                        />
                      </div>
                    </ContextMenuTrigger>
                    {lineSelection.selectedRange && (
                      <ContextMenuContent>
                        <ContextMenuItem
                          onClick={() => setContextMenuDialogOpen(true)}
                        >
                          <MessageSquarePlus className="h-4 w-4" />
                          Ask or request changes...
                        </ContextMenuItem>
                      </ContextMenuContent>
                    )}
                  </ContextMenu>
                ) : null}

                {/* Context menu dialog */}
                <RequestChangesDialog
                  filePath={relativeFilePath}
                  lineRange={lineSelection.selectedRange}
                  open={contextMenuDialogOpen}
                  onOpenChange={setContextMenuDialogOpen}
                  onSubmit={handleContextMenuRequestChanges}
                />
              </div>
            </>
          ) : (
            <Empty className="h-full">
              <EmptyIcon>
                <FileCode />
              </EmptyIcon>
              <EmptyTitle>No file selected</EmptyTitle>
              <EmptyDescription>
                Select a file from the tree to view its contents
              </EmptyDescription>
            </Empty>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
