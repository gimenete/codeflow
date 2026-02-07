/**
 * Toggle the Nth checkbox in a GitHub-flavored markdown string.
 * Matches patterns like `- [ ]`, `- [x]`, `- [X]`, `* [ ]`, `+ [ ]`, `1. [ ]`.
 */
export function toggleCheckboxInMarkdown(
  body: string,
  checkboxIndex: number,
  checked: boolean,
): string {
  const checkboxRegex = /^(\s*(?:[-*+]|\d+\.)\s+)\[([ xX])\]/gm;
  let currentIndex = 0;

  return body.replace(checkboxRegex, (match, prefix: string) => {
    if (currentIndex === checkboxIndex) {
      currentIndex++;
      return `${prefix}[${checked ? "x" : " "}]`;
    }
    currentIndex++;
    return match;
  });
}

/**
 * Toggle the Nth checkbox in an HTML string (GitHub's rendered bodyHTML).
 * Used for optimistic UI updates before the server responds.
 */
export function toggleCheckboxInHtml(
  html: string,
  checkboxIndex: number,
  checked: boolean,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const checkboxes = doc.querySelectorAll('input[type="checkbox"]');

  if (checkboxIndex < checkboxes.length) {
    if (checked) {
      checkboxes[checkboxIndex].setAttribute("checked", "");
    } else {
      checkboxes[checkboxIndex].removeAttribute("checked");
    }
  }

  return doc.body.innerHTML;
}
