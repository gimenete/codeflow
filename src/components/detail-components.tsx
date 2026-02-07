import { CommitHash } from "@/components/commit-hash";
import { EmojiText } from "@/components/emoji-text";
import { Scrollable } from "@/components/flex-layout";
import { HtmlRenderer } from "@/components/html-renderer";
import { LazyDiffViewer } from "@/components/lazy-diff-viewer";
import { RelativeTime } from "@/components/relative-time";
import {
  TimelineEventItem,
  GroupedLabelsEvent,
  type TimelineNode,
  type Actor,
} from "@/components/timeline-events";
import type { ReactionContent } from "@/generated/graphql";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserLogin } from "@/components/user-info";
import type {
  IssueMetadata,
  Label,
  PullRequestMetadata,
} from "@/lib/github-types";
import { GitHubCommentTextarea } from "@/components/github-comment-textarea";
import { Button } from "@/components/ui/button";
import { cn, fuzzyFilter } from "@/lib/utils";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  PencilIcon,
} from "lucide-react";
import {
  FileIcon,
  FolderIcon,
  DefaultFolderOpenedIcon,
} from "@react-symbols/icons/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Type for grouped label events (internal representation)
interface GroupedLabelEvent {
  __typename: "GroupedLabels";
  action: "added" | "removed";
  actor: Actor;
  createdAt: string;
  labels: Label[];
}

type ProcessedTimelineEvent = TimelineNode | GroupedLabelEvent;

// Helper to get actor from different event types
function getEventActor(event: TimelineNode): Actor {
  if ("actor" in event) {
    return event.actor ?? null;
  }
  if ("author" in event) {
    return event.author ?? null;
  }
  return null;
}

// Helper to get login from actor
function getActorLogin(actor: Actor): string {
  return actor?.login ?? "ghost";
}

// Group consecutive labeled/unlabeled events by the same user
function groupLabelEvents(events: TimelineNode[]): ProcessedTimelineEvent[] {
  const result: ProcessedTimelineEvent[] = [];

  let i = 0;
  while (i < events.length) {
    const event = events[i];

    // Check if this is a labeled or unlabeled event that can be grouped
    if (
      event.__typename === "LabeledEvent" ||
      event.__typename === "UnlabeledEvent"
    ) {
      const labels: Label[] = [];
      const typename = event.__typename;
      const action = typename === "LabeledEvent" ? "added" : "removed";
      const actor = getEventActor(event);
      const createdAt = event.createdAt;

      // Collect consecutive events of the same type by the same user
      while (
        i < events.length &&
        events[i].__typename === typename &&
        getActorLogin(getEventActor(events[i])) === getActorLogin(actor)
      ) {
        const labelEvent = events[i];
        if (
          labelEvent.__typename === "LabeledEvent" ||
          labelEvent.__typename === "UnlabeledEvent"
        ) {
          labels.push(labelEvent.label);
        }
        i++;
      }

      // If we grouped multiple labels, create a grouped event
      if (labels.length > 1) {
        result.push({
          __typename: "GroupedLabels",
          action,
          actor,
          createdAt,
          labels,
        });
      } else if (labels.length === 1) {
        // Single label, use the original event
        result.push(event);
      }
    } else {
      result.push(event);
      i++;
    }
  }

  return result;
}

export interface TimelineProps {
  data: PullRequestMetadata | IssueMetadata;
  timelineItems: TimelineNode[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  isLoading?: boolean;
  footer?: React.ReactNode;
  onToggleReaction?: (
    subjectId: string,
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
  onEditComment?: (commentId: string, body: string) => Promise<void>;
  onEditReviewComment?: (commentId: string, body: string) => Promise<void>;
  onEditDescription?: (body: string) => Promise<void>;
  onCommitClick?: (sha: string) => void;
  accountId?: string;
  owner?: string;
  repo?: string;
}

function TimelineEventSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function Timeline({
  data,
  timelineItems,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
  footer,
  onToggleReaction,
  onEditComment,
  onEditReviewComment,
  onEditDescription,
  onCommitClick,
  accountId,
  owner,
  repo,
}: TimelineProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Group consecutive label events
  const processedEvents = useMemo(
    () => groupLabelEvents(timelineItems),
    [timelineItems],
  );

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Scrollable.Vertical>
      <div className="p-4 space-y-4 max-w-4xl">
        <EditableDescription
          data={data}
          onEditDescription={onEditDescription}
          accountId={accountId}
          owner={owner}
          repo={repo}
        />

        {processedEvents.map((event, index) => (
          <ProcessedEventItem
            key={index}
            event={event}
            onToggleReaction={onToggleReaction}
            onEditComment={onEditComment}
            onEditReviewComment={onEditReviewComment}
            onCommitClick={onCommitClick}
            accountId={accountId}
            owner={owner}
            repo={repo}
          />
        ))}

        {/* Timeline loading skeletons */}
        {isLoading && timelineItems.length === 0 && (
          <>
            <TimelineEventSkeleton />
            <TimelineEventSkeleton />
            <TimelineEventSkeleton />
          </>
        )}

        {/* Load more trigger */}
        <div ref={loadMoreRef} className="py-4">
          {isFetchingNextPage && (
            <div className="flex justify-center">
              <div className="text-sm text-muted-foreground">
                Loading more...
              </div>
            </div>
          )}
        </div>

        {footer}
      </div>
    </Scrollable.Vertical>
  );
}

function EditableDescription({
  data,
  onEditDescription,
  accountId,
  owner,
  repo,
}: {
  data: PullRequestMetadata | IssueMetadata;
  onEditDescription?: (body: string) => Promise<void>;
  accountId?: string;
  owner?: string;
  repo?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit =
    data.viewerCanUpdate && onEditDescription && accountId && owner && repo;

  const handleStartEdit = () => {
    setEditBody(data.body ?? "");
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBody("");
    setError(null);
  };

  const handleSubmitEdit = async () => {
    if (!onEditDescription) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onEditDescription(editBody);
      setIsEditing(false);
      setEditBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update description");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="group/description border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={data.author.avatarUrl} />
          <AvatarFallback>
            {data.author.login.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <UserLogin login={data.author.login} accountId={accountId}>
          <span className="font-medium">{data.author.login}</span>
        </UserLogin>
        <span className="text-sm text-muted-foreground">
          commented <RelativeTime date={data.createdAt} />
        </span>
        {canEdit && !isEditing && (
          <button
            onClick={handleStartEdit}
            className="ml-auto opacity-0 group-hover/description:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
            title="Edit description"
          >
            <PencilIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {isEditing && accountId && owner && repo ? (
        <div className="space-y-3">
          <GitHubCommentTextarea
            value={editBody}
            onChange={setEditBody}
            accountId={accountId}
            owner={owner}
            repo={repo}
            onSubmit={handleSubmitEdit}
            className="min-h-[100px] resize-y"
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitEdit}
              disabled={isSubmitting}
            >
              Update description
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <HtmlRenderer html={data.bodyHTML ?? ""} />
        </div>
      )}
    </div>
  );
}

// Component that handles both regular timeline events and grouped labels
function ProcessedEventItem({
  event,
  onToggleReaction,
  onEditComment,
  onEditReviewComment,
  onCommitClick,
  accountId,
  owner,
  repo,
}: {
  event: ProcessedTimelineEvent;
  onToggleReaction?: (
    subjectId: string,
    content: ReactionContent,
    viewerHasReacted: boolean,
  ) => void;
  onEditComment?: (commentId: string, body: string) => Promise<void>;
  onEditReviewComment?: (commentId: string, body: string) => Promise<void>;
  onCommitClick?: (sha: string) => void;
  accountId?: string;
  owner?: string;
  repo?: string;
}) {
  if (event.__typename === "GroupedLabels") {
    return (
      <GroupedLabelsEvent
        actor={event.actor}
        createdAt={event.createdAt}
        labels={event.labels}
        action={event.action}
        accountId={accountId}
      />
    );
  }

  return (
    <TimelineEventItem
      event={event}
      onToggleReaction={onToggleReaction}
      onEditComment={onEditComment}
      onEditReviewComment={onEditReviewComment}
      onCommitClick={onCommitClick}
      accountId={accountId}
      owner={owner}
      repo={repo}
    />
  );
}

export interface CommitsListProps {
  commits: Array<{
    sha: string;
    message: string;
    author: { login: string; avatarUrl: string };
    date: string;
  }>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  onCommitClick?: (sha: string) => void;
}

export function CommitsList({
  commits,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onCommitClick,
}: CommitsListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Scrollable.Vertical>
      <div className="divide-y">
        {commits.map((commit) => (
          <div
            key={commit.sha}
            className={`p-4 flex items-center gap-3 ${onCommitClick ? "cursor-pointer hover:bg-accent transition-colors" : ""}`}
            onClick={() => onCommitClick?.(commit.sha)}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={commit.author.avatarUrl} />
              <AvatarFallback>
                {commit.author.login.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                <EmojiText text={commit.message.split("\n")[0]} />
              </p>
              <p className="text-sm text-muted-foreground">
                {commit.author.login} committed{" "}
                <RelativeTime date={commit.date} />
              </p>
            </div>
            <CommitHash sha={commit.sha} />
          </div>
        ))}
      </div>
      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4">
        {isFetchingNextPage && (
          <div className="flex justify-center">
            <div className="text-sm text-muted-foreground">Loading more...</div>
          </div>
        )}
      </div>
    </Scrollable.Vertical>
  );
}

export interface FilesListProps {
  files: Array<{
    path: string;
    status: string;
    patch?: string;
  }>;
}

// Tree node for file tree view
interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  status?: string;
}

// Build tree from flat file list
function buildFileTree(
  files: Array<{
    path: string;
    status: string;
  }>,
): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === parts.length - 1;

      if (isFile) {
        current.push({
          name: part,
          path: file.path,
          type: "file",
          status: file.status,
        });
      } else {
        let dir = current.find(
          (n) => n.type === "directory" && n.name === part,
        );
        if (!dir) {
          dir = {
            name: part,
            path: currentPath,
            type: "directory",
            children: [],
          };
          current.push(dir);
        }
        current = dir.children!;
      }
    }
  }

  // Sort: directories first, then alphabetically
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortNodes(node.children);
    }
  };
  sortNodes(root);

  return root;
}

// Collect all directory paths from a tree
function collectDirectoryPaths(nodes: FileTreeNode[]): Set<string> {
  const paths = new Set<string>();
  const walk = (nodes: FileTreeNode[]) => {
    for (const node of nodes) {
      if (node.type === "directory") {
        paths.add(node.path);
        if (node.children) walk(node.children);
      }
    }
  };
  walk(nodes);
  return paths;
}

// Tree node component for file sidebar
function FilesTreeNode({
  node,
  depth,
  selectedFile,
  expandedPaths,
  onToggle,
  onFileSelect,
}: {
  node: FileTreeNode;
  depth: number;
  selectedFile: string | null;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onFileSelect: (path: string) => void;
}) {
  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedFile === node.path;
  const isDirectory = node.type === "directory";

  const handleClick = () => {
    if (isDirectory) {
      onToggle(node.path);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50 text-sm",
          isSelected && "bg-accent",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="shrink-0">
              {isExpanded ? (
                <DefaultFolderOpenedIcon className="h-4 w-4" />
              ) : (
                <FolderIcon folderName={node.name} className="h-4 w-4" />
              )}
            </span>
          </>
        ) : (
          <>
            <span className="w-4 shrink-0" />
            <span className="shrink-0">
              <FileIcon fileName={node.name} autoAssign className="h-4 w-4" />
            </span>
          </>
        )}
        <span className="truncate flex-1">{node.name}</span>
      </div>

      {isDirectory && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FilesTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FilesList({ files }: FilesListProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredFiles = useMemo(
    () => fuzzyFilter(files, searchQuery, (f) => f.path),
    [files, searchQuery],
  );

  // Build tree structure from files
  const fileTree = useMemo(() => buildFileTree(files), [files]);

  // All directories expanded by default
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() =>
    collectDirectoryPaths(fileTree),
  );

  // Update expanded paths when files change (e.g. switching commits)
  useEffect(() => {
    setExpandedPaths(collectDirectoryPaths(fileTree));
  }, [fileTree]);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const scrollToFile = useCallback((path: string) => {
    setSelectedFile(path);
    const element = document.getElementById(
      `file-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
    );
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Scroll focused item into view and focus list for keyboard navigation
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const item = listRef.current.querySelector(
        `[data-index="${focusedIndex}"]`,
      );
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
      listRef.current.focus();
    }
  }, [focusedIndex]);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown" && filteredFiles.length > 0) {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === "Enter" && filteredFiles.length > 0) {
        e.preventDefault();
        scrollToFile(filteredFiles[0].path);
      } else if (e.key === "Escape") {
        setSearchQuery("");
        setFocusedIndex(-1);
      }
    },
    [filteredFiles, scrollToFile],
  );

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (focusedIndex === 0) {
          setFocusedIndex(-1);
          inputRef.current?.focus();
        } else {
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (e.key === "Enter" && focusedIndex >= 0) {
        e.preventDefault();
        scrollToFile(filteredFiles[focusedIndex].path);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setFocusedIndex(-1);
        inputRef.current?.focus();
      }
    },
    [focusedIndex, filteredFiles, scrollToFile],
  );

  // Check if any files have patches
  const hasAnyPatches = files.some((f) => f.patch);

  if (!hasAnyPatches) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No diff data available. The diffs may be too large or the files may be
        binary.
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* File sidebar */}
      <div className="w-80 border-r shrink-0 flex flex-col min-h-0 h-full">
        <div className="p-2 border-b shrink-0">
          <Input
            ref={inputRef}
            placeholder="Filter files..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFocusedIndex(-1);
            }}
            onKeyDown={handleInputKeyDown}
            className="h-8"
          />
        </div>
        <Scrollable.Vertical>
          {searchQuery ? (
            // Flat filtered list when searching
            <div
              ref={listRef}
              className="p-2 space-y-1 outline-none"
              tabIndex={0}
              onKeyDown={handleListKeyDown}
            >
              {filteredFiles.map((file, index) => (
                <div
                  key={file.path}
                  data-index={index}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded text-sm cursor-pointer hover:bg-accent",
                    selectedFile === file.path && "bg-accent",
                    focusedIndex === index && "ring-2 ring-ring ring-offset-1",
                  )}
                  onClick={() => scrollToFile(file.path)}
                >
                  <span className="shrink-0">
                    <FileIcon
                      fileName={file.path.split("/").pop() ?? file.path}
                      autoAssign
                      className="h-4 w-4"
                    />
                  </span>
                  <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                    <span className="whitespace-nowrap">{file.path}</span>
                  </div>
                </div>
              ))}
              {filteredFiles.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No files match &quot;{searchQuery}&quot;
                </div>
              )}
            </div>
          ) : (
            // Tree view when not searching
            <div className="py-1">
              {fileTree.map((node) => (
                <FilesTreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedFile={selectedFile}
                  expandedPaths={expandedPaths}
                  onToggle={handleToggle}
                  onFileSelect={scrollToFile}
                />
              ))}
            </div>
          )}
        </Scrollable.Vertical>
      </div>

      {/* All diffs in vertical scroll */}
      <Scrollable.Vertical ref={contentRef} className="min-w-0">
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.path}
              id={`file-${file.path.replace(/[^a-zA-Z0-9]/g, "-")}`}
            >
              {file.patch ? (
                <div className="p-4 overflow-x-auto max-w-full">
                  <LazyDiffViewer diff={file.patch} filePath={file.path} />
                </div>
              ) : (
                <div className="p-4 text-muted-foreground text-sm">
                  Binary file or no changes
                </div>
              )}
            </div>
          ))}
        </div>
      </Scrollable.Vertical>
    </div>
  );
}

export function DetailSkeleton({ type = "pull" }: { type?: "pull" | "issue" }) {
  return (
    <div className="flex flex-col flex-1 h-full min-h-0">
      {/* Header */}
      <div className="bg-background shrink-0">
        <div className="border-b px-4 py-3 space-y-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-5 w-5 rounded-full mt-1" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-7 w-3/4" />
              {type === "pull" ? (
                <>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs row */}
        {type === "pull" && (
          <div className="flex items-center gap-1 border-b px-2 h-9">
            <Skeleton className="h-6 w-28 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-6 w-32 rounded-md" />
          </div>
        )}
      </div>

      {/* Content area: timeline + sidebar */}
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Timeline area */}
        <div className="flex-1 p-4 space-y-4 max-w-4xl overflow-hidden">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>

        {/* Sidebar area */}
        <div className="w-64 border-l p-4 space-y-4 shrink-0 hidden lg:block">
          {/* Assignees */}
          <div>
            <Skeleton className="h-4 w-20 mb-2" />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
          <Separator />

          {/* Labels */}
          <div>
            <Skeleton className="h-4 w-14 mb-2" />
            <div className="flex flex-wrap gap-1">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </div>
          <Separator />

          {/* Reviewers */}
          {type === "pull" && (
            <>
              <div>
                <Skeleton className="h-4 w-20 mb-2" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-18" />
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Milestone */}
          <div>
            <Skeleton className="h-4 w-18 mb-2" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
