import { File } from "@pierre/diffs/react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileTree } from "./file-tree";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useDiffTheme } from "@/lib/use-diff-theme";
import type { TrackedBranch } from "@/lib/github-types";
import { Search, ChevronUp, ChevronDown, X } from "lucide-react";
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

function getFileExtension(filePath: string): string {
  const parts = filePath.split("/");
  const fileName = parts[parts.length - 1];
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName.substring(dotIndex + 1).toLowerCase();
}

export function BranchCodeView({ repositoryPath }: BranchCodeViewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const theme = useDiffTheme();

  const handleFileSelect = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    setFileContent(null);
    setFileError(null);
    setSearchQuery("");
    setSearchResults([]);
    setCurrentMatchIndex(0);

    if (!window.fsAPI) {
      setFileError("File system API not available");
      return;
    }

    try {
      setLoadingFile(true);
      const content = await window.fsAPI.readFile(filePath);
      setFileContent(content);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setLoadingFile(false);
    }
  }, []);

  // Compute matches when query or content changes
  useEffect(() => {
    if (!searchQuery || !fileContent) {
      setSearchResults([]);
      setCurrentMatchIndex(0);
      return;
    }

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

    setSearchResults(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);
  }, [searchQuery, fileContent]);

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

  // Selected line for current match (strong highlight)
  const selectedLines =
    currentMatchIndex >= 0 && searchResults[currentMatchIndex]
      ? {
          start: searchResults[currentMatchIndex].lineNumber,
          end: searchResults[currentMatchIndex].lineNumber,
        }
      : null;

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

  const selectedFileName = selectedFile?.split("/").pop() || "";
  const fileExtension = selectedFile ? getFileExtension(selectedFile) : "";

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
                <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search in file..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (e.shiftKey) {
                            goToPreviousMatch();
                          } else {
                            goToNextMatch();
                          }
                        }
                      }}
                      className="pl-8 h-7 text-sm"
                    />
                  </div>

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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setSearchQuery("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-auto">
                {loadingFile ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    Loading file...
                  </div>
                ) : fileError ? (
                  <div className="flex h-full items-center justify-center text-destructive p-4 text-center">
                    {fileError}
                  </div>
                ) : fileContent !== null ? (
                  <File
                    file={{
                      name: selectedFileName,
                      contents: fileContent,
                      lang: fileExtension as never,
                    }}
                    options={{
                      themeType: theme,
                      overflow: "scroll",
                      unsafeCSS: searchHighlightCSS,
                    }}
                    selectedLines={selectedLines}
                    className="font-mono text-xs"
                  />
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Select a file to view
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
