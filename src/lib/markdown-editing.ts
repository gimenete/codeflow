/**
 * Utilities for advanced markdown editing in textareas.
 *
 * All edits are described as { from, to, insert, cursor } so callers can apply
 * them via `document.execCommand('insertText')` to preserve native undo history.
 */

export function isUrl(text: string): boolean {
  try {
    new URL(text.trim());
    return true;
  } catch {
    return false;
  }
}

/** Describes a text replacement that can be applied with execCommand. */
export interface MarkdownEdit {
  /** Start offset of the range to replace in the original text */
  from: number;
  /** End offset of the range to replace */
  to: number;
  /** Text to insert (replaces from..to) */
  insert: string;
  /** Cursor / selection start after the edit */
  cursorStart: number;
  /** Cursor / selection end after the edit */
  cursorEnd: number;
}

/**
 * Apply a MarkdownEdit to a textarea using `document.execCommand` so the
 * change participates in the browser's native undo stack.
 */
export function applyEdit(
  textarea: HTMLTextAreaElement,
  edit: MarkdownEdit,
): void {
  textarea.focus();
  textarea.setSelectionRange(edit.from, edit.to);
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- intentional: execCommand is the only way to preserve native undo history in textareas
  document.execCommand("insertText", false, edit.insert);
  textarea.setSelectionRange(edit.cursorStart, edit.cursorEnd);
}

// ---------------------------------------------------------------------------
// Paste: wrap selected text into markdown link
// ---------------------------------------------------------------------------

/**
 * When the user pastes a URL and has text selected, wrap the selection into a
 * markdown link `[selected](url)` and place the cursor right after the closing
 * parenthesis. If the selected text is itself a URL, returns null so the
 * default paste behaviour is used.
 */
export function getUrlPasteEdit(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  pastedText: string,
): MarkdownEdit | null {
  const url = pastedText.trim();
  if (!isUrl(url)) return null;

  // Only act when there is a non-empty selection
  if (selectionStart === selectionEnd) return null;

  const selected = value.slice(selectionStart, selectionEnd);
  // If the selected text is itself a URL, let the default paste happen
  if (isUrl(selected)) return null;

  const insert = `[${selected}](${url})`;
  const cursorPos = selectionStart + insert.length;

  return {
    from: selectionStart,
    to: selectionEnd,
    insert,
    cursorStart: cursorPos,
    cursorEnd: cursorPos,
  };
}

// ---------------------------------------------------------------------------
// Enter: auto-continue lists
// ---------------------------------------------------------------------------

/**
 * Regex that captures the leading whitespace + list marker of the current line.
 *
 * Supported list styles:
 *   - `- `, `* `, `+ `         (unordered)
 *   - `- [ ] `, `- [x] `, etc  (task list, any bullet)
 *   - `1. `, `12. `            (ordered)
 *   - `1) `, `12) `            (ordered, parenthesis style)
 */
const LIST_LINE_RE =
  /^(?<indent>[ \t]*)(?<marker>(?<bullet>[*+-])(?:\s(?<task>\[[ x]\])\s|\s)|(?<ordered>\d+)[.)]\s)(?<rest>.*)$/;

/**
 * When Enter is pressed, check whether the current line is a list item and, if
 * so, return an edit that inserts a new list item of the same type.
 *
 * If the current list item is empty (the user pressed Enter on a blank bullet),
 * remove the marker instead of adding a new one (outdent behaviour).
 */
export function getListContinuationEdit(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): MarkdownEdit | null {
  // Only handle collapsed cursor (no selection)
  if (selectionStart !== selectionEnd) return null;

  // Find the start of the current line
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const currentLine = value.slice(lineStart, selectionStart);

  const match = LIST_LINE_RE.exec(currentLine);
  if (!match || !match.groups) return null;

  const { indent, marker, ordered, rest } = match.groups;

  // If the rest of the line is empty, the user pressed Enter on a blank bullet.
  // Remove the bullet to "outdent" instead of continuing the list.
  if (!rest || rest.trim() === "") {
    return {
      from: lineStart,
      to: selectionStart,
      insert: "",
      cursorStart: lineStart,
      cursorEnd: lineStart,
    };
  }

  // Build the next list-item prefix
  let nextMarker: string;
  if (ordered) {
    const num = parseInt(ordered, 10) + 1;
    const punc = marker.includes(")") ? ")" : ".";
    nextMarker = `${num}${punc} `;
  } else {
    const bullet = match.groups.bullet;
    if (match.groups.task) {
      nextMarker = `${bullet} [ ] `;
    } else {
      nextMarker = `${bullet} `;
    }
  }

  const insert = `\n${indent}${nextMarker}`;
  const cursorPos = selectionStart + insert.length;

  return {
    from: selectionStart,
    to: selectionStart,
    insert,
    cursorStart: cursorPos,
    cursorEnd: cursorPos,
  };
}

// ---------------------------------------------------------------------------
// Cmd+B / Cmd+I: toggle bold / italic
// ---------------------------------------------------------------------------

/**
 * Wrap or unwrap the selected text with the given `wrapper` string
 * (e.g. `**` for bold, `*` for italic).
 *
 * - If text is selected and already wrapped, unwrap it.
 * - If text is selected and not wrapped, wrap it.
 * - If no text is selected, insert the wrapper pair and place the cursor
 *   in between.
 */
export function getInlineStyleEdit(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  wrapper: string,
): MarkdownEdit {
  const wLen = wrapper.length;

  if (selectionStart === selectionEnd) {
    // No selection – insert wrapper pair and place cursor inside
    const insert = wrapper + wrapper;
    const cursorPos = selectionStart + wLen;
    return {
      from: selectionStart,
      to: selectionEnd,
      insert,
      cursorStart: cursorPos,
      cursorEnd: cursorPos,
    };
  }

  const selected = value.slice(selectionStart, selectionEnd);

  // Check if the selection is already wrapped (wrappers sit just outside)
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const hasOuterWrap =
    before.length >= wLen &&
    after.length >= wLen &&
    before.slice(-wLen) === wrapper &&
    after.slice(0, wLen) === wrapper;

  if (hasOuterWrap) {
    // Unwrap: replace wrappers + selection with just the selection text
    const from = selectionStart - wLen;
    const to = selectionEnd + wLen;
    return {
      from,
      to,
      insert: selected,
      cursorStart: from,
      cursorEnd: from + selected.length,
    };
  }

  // Check if the selected text itself starts and ends with the wrapper
  if (
    selected.length >= wLen * 2 &&
    selected.slice(0, wLen) === wrapper &&
    selected.slice(-wLen) === wrapper
  ) {
    const inner = selected.slice(wLen, -wLen);
    return {
      from: selectionStart,
      to: selectionEnd,
      insert: inner,
      cursorStart: selectionStart,
      cursorEnd: selectionStart + inner.length,
    };
  }

  // Wrap the selection
  const insert = wrapper + selected + wrapper;
  return {
    from: selectionStart,
    to: selectionEnd,
    insert,
    cursorStart: selectionStart + wLen,
    cursorEnd: selectionStart + wLen + selected.length,
  };
}
