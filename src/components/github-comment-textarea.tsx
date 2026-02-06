import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type ComponentProps,
} from "react";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PullStateIcon } from "@/components/pull-state-icon";
import { IssueStateIcon } from "@/components/issue-state-icon";
import { cn } from "@/lib/utils";
import {
  useUserSearch,
  useIssueSearch,
  useMentionableUsers,
  useRecentIssues,
} from "@/lib/queries";
import { fuzzyFilter } from "@/lib/fuzzy-search";
import { githubEmojis, emojiNames } from "@/lib/github-emojis";

type TriggerType = "@" | "#" | ":";

interface TriggerInfo {
  type: TriggerType;
  start: number;
  searchText: string;
}

function findTrigger(text: string, cursorPos: number): TriggerInfo | null {
  for (let i = cursorPos - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "@" || ch === "#" || ch === ":") {
      if (i === 0 || text[i - 1] === " " || text[i - 1] === "\n") {
        return { type: ch, start: i, searchText: text.slice(i + 1, cursorPos) };
      }
      return null;
    }
    if (ch === " " || ch === "\n") break;
  }
  return null;
}

function insertMention(
  value: string,
  triggerStart: number,
  cursorPos: number,
  insertText: string,
): { newValue: string; newCursorPos: number } {
  const before = value.slice(0, triggerStart);
  const after = value.slice(cursorPos);
  const newValue = before + insertText + " " + after;
  const newCursorPos = before.length + insertText.length + 1;
  return { newValue, newCursorPos };
}

const mirrorStyles = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "boxSizing",
  "whiteSpace",
  "overflowWrap",
  "tabSize",
  "textTransform",
  "textIndent",
  "wordSpacing",
] as const;

function getCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number,
): { top: number; left: number } {
  const div = document.createElement("div");
  const computed = getComputedStyle(textarea);

  div.style.position = "absolute";
  div.style.top = "-9999px";
  div.style.left = "-9999px";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.overflowWrap = "break-word";
  div.style.width = `${textarea.clientWidth}px`;

  for (const prop of mirrorStyles) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (div.style as any)[prop] = computed[prop];
  }

  div.textContent = textarea.value.substring(0, position);

  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  div.appendChild(marker);

  document.body.appendChild(div);

  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft;

  document.body.removeChild(div);

  return { top, left };
}

interface GitHubCommentTextareaProps extends Omit<
  ComponentProps<"textarea">,
  "onChange" | "value"
> {
  value: string;
  onChange: (value: string) => void;
  accountId: string;
  owner: string;
  repo: string;
}

export function GitHubCommentTextarea({
  value,
  onChange,
  accountId,
  owner,
  repo,
  className,
  ...props
}: GitHubCommentTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useMemo(
    () => findTrigger(value, cursorPosition),
    [value, cursorPosition],
  );

  // Reset dismissed state when trigger changes
  const triggerKey = trigger ? `${trigger.type}:${trigger.start}` : null;
  const prevTriggerKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (triggerKey !== prevTriggerKeyRef.current) {
      setDismissed(false);
      setSelectedIndex(0);
      prevTriggerKeyRef.current = triggerKey;
    }
  }, [triggerKey]);

  // Debounce search text for API calls (@ and #)
  const triggerType = trigger?.type ?? null;
  const triggerSearchText = trigger?.searchText ?? "";
  useEffect(() => {
    if (!triggerType || triggerType === ":") {
      setDebouncedSearchText("");
      return;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearchText(triggerSearchText);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [triggerType, triggerSearchText]);

  // Data fetching
  const userSearchQuery = trigger?.type === "@" ? debouncedSearchText : "";
  const issueSearchQuery = trigger?.type === "#" ? debouncedSearchText : "";
  const emojiSearchText = trigger?.type === ":" ? trigger.searchText : "";

  const { data: users, isLoading: usersLoading } = useUserSearch(
    accountId,
    userSearchQuery,
  );
  const { data: issues, isLoading: issuesLoading } = useIssueSearch(
    accountId,
    owner,
    repo,
    issueSearchQuery,
  );
  const { data: mentionableUsers } = useMentionableUsers(
    accountId,
    owner,
    repo,
  );
  const { data: recentIssues } = useRecentIssues(accountId, owner, repo);

  const emojiResults = useMemo(() => {
    if (!emojiSearchText) return [];
    if (emojiSearchText.length < 2) {
      const prefix = emojiSearchText.toLowerCase();
      return emojiNames
        .filter((n) => n.startsWith(prefix))
        .slice(0, 8)
        .map((item) => ({ item, score: 0, matchIndices: [] as number[] }));
    }
    return fuzzyFilter(emojiNames, emojiSearchText, (name) => name, 8);
  }, [emojiSearchText]);

  const defaultEmojiResults = useMemo(
    () =>
      emojiNames
        .slice(0, 8)
        .map((item) => ({ item, score: 0, matchIndices: [] as number[] })),
    [],
  );

  // Compute effective items based on whether user has typed a query
  const effectiveUsers = useMemo(() => {
    if (trigger?.type !== "@") return undefined;
    if (!triggerSearchText) return mentionableUsers;
    return users;
  }, [trigger?.type, triggerSearchText, mentionableUsers, users]);

  const effectiveIssues = useMemo(() => {
    if (trigger?.type !== "#") return undefined;
    if (!triggerSearchText) return recentIssues;
    return issues;
  }, [trigger?.type, triggerSearchText, recentIssues, issues]);

  const effectiveEmojiResults = useMemo(() => {
    if (trigger?.type !== ":") return [];
    if (!trigger.searchText) return defaultEmojiResults;
    return emojiResults;
  }, [trigger?.type, trigger?.searchText, defaultEmojiResults, emojiResults]);

  // Determine what items to show
  const isPopoverVisible = !dismissed && trigger !== null;

  const itemCount = useMemo(() => {
    if (!trigger) return 0;
    if (trigger.type === "@") return effectiveUsers?.length ?? 0;
    if (trigger.type === "#") return effectiveIssues?.length ?? 0;
    if (trigger.type === ":") return effectiveEmojiResults.length;
    return 0;
  }, [trigger, effectiveUsers, effectiveIssues, effectiveEmojiResults]);

  const isLoading = useMemo(() => {
    if (!trigger) return false;
    if (trigger.type === "@") return triggerSearchText ? usersLoading : false;
    if (trigger.type === "#") return triggerSearchText ? issuesLoading : false;
    return false;
  }, [trigger, triggerSearchText, usersLoading, issuesLoading]);

  // Clamp selected index
  useEffect(() => {
    if (itemCount > 0 && selectedIndex >= itemCount) {
      setSelectedIndex(itemCount - 1);
    }
  }, [itemCount, selectedIndex]);

  // Compute popover position at trigger character
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!trigger || !textareaRef.current) {
      setPopoverPosition(null);
      return;
    }
    const textarea = textareaRef.current;
    function updatePosition() {
      const coords = getCaretCoordinates(textarea, trigger!.start);
      const computed = getComputedStyle(textarea);
      const lineHeight =
        parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
      setPopoverPosition({ top: coords.top + lineHeight, left: coords.left });
    }
    updatePosition();
    textarea.addEventListener("scroll", updatePosition);
    return () => textarea.removeEventListener("scroll", updatePosition);
  }, [trigger]);

  const handleSelect = useCallback(
    (index: number) => {
      if (!trigger) return;
      let insertText = "";

      if (trigger.type === "@" && effectiveUsers?.[index]) {
        insertText = `@${effectiveUsers[index].login}`;
      } else if (trigger.type === "#" && effectiveIssues?.[index]) {
        insertText = `#${effectiveIssues[index].number}`;
      } else if (trigger.type === ":" && effectiveEmojiResults[index]) {
        insertText = `:${effectiveEmojiResults[index].item}:`;
      } else {
        return;
      }

      const { newValue, newCursorPos } = insertMention(
        value,
        trigger.start,
        cursorPosition,
        insertText,
      );
      onChange(newValue);

      // Set cursor position after React re-renders
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          textareaRef.current.focus();
        }
      });
    },
    [
      trigger,
      effectiveUsers,
      effectiveIssues,
      effectiveEmojiResults,
      value,
      cursorPosition,
      onChange,
    ],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isPopoverVisible) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setDismissed(true);
        return;
      }

      if (e.key === "ArrowDown" && itemCount > 0) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % itemCount);
        return;
      }

      if (e.key === "ArrowUp" && itemCount > 0) {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + itemCount) % itemCount);
        return;
      }

      if (e.key === "Enter" && itemCount > 0) {
        e.preventDefault();
        handleSelect(selectedIndex);
        return;
      }
    },
    [isPopoverVisible, itemCount, selectedIndex, handleSelect],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      setCursorPosition(e.target.selectionStart);
    },
    [onChange],
  );

  const handleSelect_ = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
    },
    [],
  );

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect_}
        onKeyDown={handleKeyDown}
        className={className}
        {...props}
      />
      {isPopoverVisible && (
        <MentionPopover
          trigger={trigger}
          users={effectiveUsers}
          issues={effectiveIssues}
          emojiResults={effectiveEmojiResults}
          isLoading={isLoading}
          selectedIndex={selectedIndex}
          onSelect={handleSelect}
          onClose={() => setDismissed(true)}
          position={popoverPosition}
          itemCount={itemCount}
        />
      )}
    </div>
  );
}

interface MentionPopoverProps {
  trigger: TriggerInfo;
  users: ReturnType<typeof useUserSearch>["data"];
  issues: ReturnType<typeof useIssueSearch>["data"];
  emojiResults: ReturnType<typeof fuzzyFilter<string>>;
  isLoading: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  position: { top: number; left: number } | null;
  itemCount: number;
}

function MentionPopover({
  trigger,
  users,
  issues,
  emojiResults,
  isLoading,
  selectedIndex,
  onSelect,
  onClose,
  position,
  itemCount,
}: MentionPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Click outside to close
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

  // Scroll selected into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Clamp left so popover doesn't overflow right edge
  const popoverWidth = 320;
  const parentWidth = containerRef.current?.parentElement?.clientWidth ?? 0;
  const clampedLeft = position
    ? Math.max(0, Math.min(position.left, parentWidth - popoverWidth))
    : 0;

  return (
    <div
      ref={containerRef}
      style={
        position
          ? {
              top: `${position.top}px`,
              left: `${clampedLeft}px`,
              width: `${popoverWidth}px`,
            }
          : undefined
      }
      className="absolute rounded-md border bg-popover shadow-md z-50 overflow-hidden"
    >
      <div className="max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : itemCount === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground text-center">
            No results
          </div>
        ) : (
          <>
            {trigger.type === "@" &&
              users?.map((user, index) => (
                <div
                  key={user.login}
                  ref={index === selectedIndex ? selectedRef : undefined}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/50",
                  )}
                  onClick={() => onSelect(index)}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.avatarUrl} alt={user.login} />
                    <AvatarFallback className="text-[10px]">
                      {user.login[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.login}</span>
                </div>
              ))}

            {trigger.type === "#" &&
              issues?.map((issue, index) => (
                <div
                  key={issue.number}
                  ref={index === selectedIndex ? selectedRef : undefined}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/50",
                  )}
                  onClick={() => onSelect(index)}
                >
                  {issue.isPullRequest ? (
                    <PullStateIcon
                      state={issue.state}
                      merged={issue.isMerged}
                      size="sm"
                    />
                  ) : (
                    <IssueStateIcon state={issue.state} size="sm" />
                  )}
                  <span className="text-muted-foreground shrink-0">
                    #{issue.number}
                  </span>
                  <span className="truncate">{issue.title}</span>
                </div>
              ))}

            {trigger.type === ":" &&
              emojiResults.map((result, index) => (
                <div
                  key={result.item}
                  ref={index === selectedIndex ? selectedRef : undefined}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 cursor-pointer text-sm",
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted/50",
                  )}
                  onClick={() => onSelect(index)}
                >
                  <img
                    src={githubEmojis[result.item]}
                    alt={result.item}
                    className="h-4 w-4"
                  />
                  <span>:{result.item}:</span>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
