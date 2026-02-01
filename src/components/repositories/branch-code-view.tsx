import { File } from "@pierre/diffs/react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { FileTree } from "./file-tree";
import { useState, useCallback } from "react";
import { useDiffTheme } from "@/lib/use-diff-theme";
import type { TrackedBranch } from "@/lib/github-types";
import "@/lib/fs";

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
  const theme = useDiffTheme();

  const handleFileSelect = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    setFileContent(null);
    setFileError(null);

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
                    }}
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
