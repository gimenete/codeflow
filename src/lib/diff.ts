export interface FileDiff {
  path: string;
  patch: string;
}

export function parseDiff(diffText: string): FileDiff[] {
  const files: FileDiff[] = [];

  // Split by "diff --git" markers
  const chunks = diffText.split(/^diff --git /m).filter(Boolean);

  for (const chunk of chunks) {
    // Extract file path from the first line (e.g., "a/path/to/file b/path/to/file")
    const lines = chunk.split("\n");
    const firstLine = lines[0];

    // Parse the "a/path b/path" format
    const pathMatch = firstLine.match(/a\/(.+?)\s+b\/(.+)/);
    if (!pathMatch) continue;

    const path = pathMatch[2]; // Use the "b" path (destination)

    // Find where the actual patch starts (after @@)
    const patchStartIndex = chunk.indexOf("@@");
    if (patchStartIndex === -1) {
      // Binary file or no changes - include the whole chunk as patch
      files.push({ path, patch: `diff --git ${chunk}` });
    } else {
      // Include the full diff with headers (required by @pierre/diffs PatchDiff)
      files.push({ path, patch: `diff --git ${chunk}` });
    }
  }

  return files;
}

export function getFileDiff(
  diffs: FileDiff[],
  filePath: string,
): string | undefined {
  const file = diffs.find((f) => f.path === filePath);
  return file?.patch;
}
