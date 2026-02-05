import { CommitHash } from "@/components/commit-hash";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  IssueMetadata,
  Label,
  PullRequestMetadata,
} from "@/lib/github-types";
import { fuzzyFilter } from "@/lib/utils";
import { FileText } from "lucide-react";
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
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={data.author.avatarUrl} />
              <AvatarFallback>
                {data.author.login.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{data.author.login}</span>
            <span className="text-sm text-muted-foreground">
              commented <RelativeTime date={data.createdAt} />
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <HtmlRenderer html={data.bodyHTML ?? ""} />
          </div>
        </div>

        {processedEvents.map((event, index) => (
          <ProcessedEventItem key={index} event={event} />
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
      </div>
    </Scrollable.Vertical>
  );
}

// Component that handles both regular timeline events and grouped labels
function ProcessedEventItem({ event }: { event: ProcessedTimelineEvent }) {
  if (event.__typename === "GroupedLabels") {
    return (
      <GroupedLabelsEvent
        actor={event.actor}
        createdAt={event.createdAt}
        labels={event.labels}
        action={event.action}
      />
    );
  }

  return <TimelineEventItem event={event} />;
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
              <p className="font-medium truncate">{commit.message}</p>
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
    additions: number;
    deletions: number;
    status: string;
    patch?: string;
  }>;
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
                className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer hover:bg-accent ${
                  selectedFile === file.path ? "bg-accent" : ""
                } ${focusedIndex === index ? "ring-2 ring-ring ring-offset-1" : ""}`}
                onClick={() => scrollToFile(file.path)}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-thin">
                  <span className="whitespace-nowrap">{file.path}</span>
                </div>
                <span className="text-green-600 text-xs shrink-0">
                  +{file.additions}
                </span>
                <span className="text-red-600 text-xs shrink-0">
                  -{file.deletions}
                </span>
              </div>
            ))}
            {filteredFiles.length === 0 && searchQuery && (
              <div className="p-2 text-sm text-muted-foreground text-center">
                No files match "{searchQuery}"
              </div>
            )}
          </div>
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
