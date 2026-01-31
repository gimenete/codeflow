export interface FileDiff {
  path: string;
  patch: string;
}

export interface ChangeGroup {
  // Line numbers in the file (for annotation placement)
  endAdditionLine: number | null;
  endDeletionLine: number | null;
  // Indices in the hunk lines array (for extracting lines)
  startIndex: number; // First change line index (after header)
  endIndex: number; // Last change line index
  // Line numbers at the start of this group (for patch header calculation)
  oldStartLine: number;
  newStartLine: number;
}

export interface Hunk {
  header: string; // The @@ line
  startLine: number; // Line number where hunk starts in the new file
  oldStartLine: number; // Line number where hunk starts in the old file
  lastAdditionLine: number | null; // Line number of last + line, null if no additions
  lastDeletionLine: number | null; // Line number of last - line, null if no deletions
  changeGroups: ChangeGroup[]; // Groups of consecutive changes within this hunk
  content: string; // Full hunk content including header
  lineCount: number; // Number of lines in the hunk
  lines: string[]; // Individual lines of the hunk (including header)
}

/**
 * Find all change groups within a hunk
 * A change group is a consecutive sequence of + and/or - lines
 */
function findChangeGroups(
  hunkLines: string[],
  newStartLine: number,
  oldStartLine: number,
): ChangeGroup[] {
  const groups: ChangeGroup[] = [];
  let newLineNumber = newStartLine;
  let oldLineNumber = oldStartLine;

  let currentGroup: {
    startIndex: number;
    endIndex: number;
    startAdditionLine: number | null;
    endAdditionLine: number | null;
    startDeletionLine: number | null;
    endDeletionLine: number | null;
    oldStartLine: number;
    newStartLine: number;
  } | null = null;

  // Skip the header line (first line is the @@ line)
  for (let i = 1; i < hunkLines.length; i++) {
    const line = hunkLines[i];
    const prefix = line.charAt(0);

    const isChange = prefix === "+" || prefix === "-";

    if (isChange) {
      if (!currentGroup) {
        // Start a new group
        currentGroup = {
          startIndex: i,
          endIndex: i,
          startAdditionLine: null,
          endAdditionLine: null,
          startDeletionLine: null,
          endDeletionLine: null,
          oldStartLine: oldLineNumber,
          newStartLine: newLineNumber,
        };
      }

      currentGroup.endIndex = i;

      if (prefix === "+") {
        if (currentGroup.startAdditionLine === null) {
          currentGroup.startAdditionLine = newLineNumber;
        }
        currentGroup.endAdditionLine = newLineNumber;
        newLineNumber++;
      } else if (prefix === "-") {
        if (currentGroup.startDeletionLine === null) {
          currentGroup.startDeletionLine = oldLineNumber;
        }
        currentGroup.endDeletionLine = oldLineNumber;
        oldLineNumber++;
      }
    } else {
      // Context line or end of hunk - close current group if any
      if (currentGroup) {
        groups.push({
          endAdditionLine: currentGroup.endAdditionLine,
          endDeletionLine: currentGroup.endDeletionLine,
          startIndex: currentGroup.startIndex,
          endIndex: currentGroup.endIndex,
          oldStartLine: currentGroup.oldStartLine,
          newStartLine: currentGroup.newStartLine,
        });
        currentGroup = null;
      }

      if (prefix === " ") {
        // Context line - exists in both files
        newLineNumber++;
        oldLineNumber++;
      }
    }
  }

  // Close final group if any
  if (currentGroup) {
    groups.push({
      endAdditionLine: currentGroup.endAdditionLine,
      endDeletionLine: currentGroup.endDeletionLine,
      startIndex: currentGroup.startIndex,
      endIndex: currentGroup.endIndex,
      oldStartLine: currentGroup.oldStartLine,
      newStartLine: currentGroup.newStartLine,
    });
  }

  return groups;
}

/**
 * Calculate the last addition and deletion line numbers in a hunk
 * Returns the line numbers of the last '+' and '-' lines
 */
function calculateLastChangedLines(
  hunkLines: string[],
  newStartLine: number,
  oldStartLine: number,
): { lastAdditionLine: number | null; lastDeletionLine: number | null } {
  let newLineNumber = newStartLine;
  let oldLineNumber = oldStartLine;
  let lastAdditionLine: number | null = null;
  let lastDeletionLine: number | null = null;

  // Skip the header line (first line is the @@ line)
  for (let i = 1; i < hunkLines.length; i++) {
    const line = hunkLines[i];
    const prefix = line.charAt(0);

    if (prefix === "+") {
      lastAdditionLine = newLineNumber;
      newLineNumber++;
    } else if (prefix === "-") {
      lastDeletionLine = oldLineNumber;
      oldLineNumber++;
    } else if (prefix === " ") {
      // Context line - exists in both files
      newLineNumber++;
      oldLineNumber++;
    }
  }

  return { lastAdditionLine, lastDeletionLine };
}

/**
 * Parse hunks from a git diff patch
 */
export function parseHunks(patch: string): Hunk[] {
  if (!patch || patch.trim() === "") {
    return [];
  }

  const hunks: Hunk[] = [];
  const lines = patch.split("\n");

  let currentHunk: {
    header: string;
    startLine: number;
    oldStartLine: number;
    lines: string[];
  } | null = null;

  for (const line of lines) {
    // Match hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(
      /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/,
    );

    if (hunkMatch) {
      // Save previous hunk if exists
      if (currentHunk) {
        const { lastAdditionLine, lastDeletionLine } =
          calculateLastChangedLines(
            currentHunk.lines,
            currentHunk.startLine,
            currentHunk.oldStartLine,
          );
        const changeGroups = findChangeGroups(
          currentHunk.lines,
          currentHunk.startLine,
          currentHunk.oldStartLine,
        );
        hunks.push({
          header: currentHunk.header,
          startLine: currentHunk.startLine,
          oldStartLine: currentHunk.oldStartLine,
          lastAdditionLine,
          lastDeletionLine,
          changeGroups,
          content: currentHunk.lines.join("\n"),
          lineCount: currentHunk.lines.length,
          lines: currentHunk.lines,
        });
      }

      // Start new hunk
      currentHunk = {
        header: line,
        startLine: parseInt(hunkMatch[2], 10),
        oldStartLine: parseInt(hunkMatch[1], 10),
        lines: [line],
      };
    } else if (currentHunk) {
      // Add line to current hunk
      currentHunk.lines.push(line);
    }
  }

  // Save last hunk
  if (currentHunk) {
    const { lastAdditionLine, lastDeletionLine } = calculateLastChangedLines(
      currentHunk.lines,
      currentHunk.startLine,
      currentHunk.oldStartLine,
    );
    const changeGroups = findChangeGroups(
      currentHunk.lines,
      currentHunk.startLine,
      currentHunk.oldStartLine,
    );
    hunks.push({
      header: currentHunk.header,
      startLine: currentHunk.startLine,
      oldStartLine: currentHunk.oldStartLine,
      lastAdditionLine,
      lastDeletionLine,
      changeGroups,
      content: currentHunk.lines.join("\n"),
      lineCount: currentHunk.lines.length,
      lines: currentHunk.lines,
    });
  }

  return hunks;
}

/**
 * Extract the diff header (everything before the first hunk)
 */
function extractDiffHeader(patch: string): string {
  const lines = patch.split("\n");
  const headerLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("@@")) {
      break;
    }
    headerLines.push(line);
  }

  return headerLines.join("\n");
}

/**
 * Create a valid git patch for a single hunk
 * The patch must include the diff header + index line + --- +++ lines + the hunk
 */
export function createHunkPatch(
  filePath: string,
  hunk: Hunk,
  fullPatch: string,
): string {
  // Extract the header from the full patch
  const header = extractDiffHeader(fullPatch);

  if (!header) {
    // Create a minimal header if none exists
    return `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
${hunk.content}`;
  }

  return `${header}
${hunk.content}`;
}

/**
 * Create a valid git patch for a specific change group within a hunk
 * The patch includes:
 * - The diff header (from full patch)
 * - A recalculated hunk header with correct line numbers
 * - Context line(s) before the group (when available)
 * - The change group's lines
 * - Context line(s) after the group (when available)
 */
export function createChangeGroupPatch(
  filePath: string,
  hunk: Hunk,
  group: ChangeGroup,
  fullPatch: string,
): string {
  const header = extractDiffHeader(fullPatch);

  // Filter out empty lines and special markers from hunk lines for processing
  // (they can appear at the end of the hunk)
  const isValidDiffLine = (line: string): boolean => {
    if (!line) return false;
    const prefix = line.charAt(0);
    return prefix === " " || prefix === "+" || prefix === "-";
  };

  // Find context lines around the change group
  // Look for a context line before the group
  let contextBeforeIndex = -1;
  for (let i = group.startIndex - 1; i >= 1; i--) {
    const line = hunk.lines[i];
    if (line.startsWith(" ")) {
      contextBeforeIndex = i;
      break;
    }
  }

  // Look for a context line after the group
  let contextAfterIndex = -1;
  for (let i = group.endIndex + 1; i < hunk.lines.length; i++) {
    const line = hunk.lines[i];
    if (line.startsWith(" ")) {
      contextAfterIndex = i;
      break;
    }
  }

  // Build the patch lines
  const patchLines: string[] = [];

  // Add context before if available
  if (contextBeforeIndex !== -1) {
    patchLines.push(hunk.lines[contextBeforeIndex]);
  }

  // Add the change group lines (only valid diff lines)
  for (let i = group.startIndex; i <= group.endIndex; i++) {
    const line = hunk.lines[i];
    if (isValidDiffLine(line)) {
      patchLines.push(line);
    }
  }

  // Add context after if available
  if (contextAfterIndex !== -1) {
    patchLines.push(hunk.lines[contextAfterIndex]);
  }

  // Check if we need to include "No newline at end of file" marker
  // This is needed if the last line we're including was followed by this marker
  let noNewlineMarker = "";
  const lastIncludedIndex =
    contextAfterIndex !== -1 ? contextAfterIndex : group.endIndex;
  if (lastIncludedIndex + 1 < hunk.lines.length) {
    const nextLine = hunk.lines[lastIncludedIndex + 1];
    if (nextLine.startsWith("\\ No newline")) {
      noNewlineMarker = "\n" + nextLine;
    }
  }

  // Calculate the hunk header line counts
  // Count deletions, additions, and context lines
  let deletionCount = 0;
  let additionCount = 0;
  let contextCount = 0;

  for (const line of patchLines) {
    const prefix = line.charAt(0);
    if (prefix === "-") {
      deletionCount++;
    } else if (prefix === "+") {
      additionCount++;
    } else if (prefix === " ") {
      contextCount++;
    }
  }

  // Calculate starting line numbers
  // Adjust for context line before the group
  let oldStart = group.oldStartLine;
  let newStart = group.newStartLine;

  if (contextBeforeIndex !== -1) {
    // We need to calculate how many lines back the context is
    // Context lines exist in both old and new files
    oldStart--;
    newStart--;
  }

  const oldCount = contextCount + deletionCount;
  const newCount = contextCount + additionCount;

  const hunkHeader = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`;

  // Build the final patch
  const minimalHeader =
    header ||
    `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}`;

  // Patch must end with a newline
  return `${minimalHeader}
${hunkHeader}
${patchLines.join("\n")}${noNewlineMarker}
`;
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
