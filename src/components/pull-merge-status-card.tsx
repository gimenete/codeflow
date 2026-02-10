import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { openInBrowser } from "@/lib/actions";
import { getAccount } from "@/lib/auth";
import { usePRCommits, usePullMergeStatus } from "@/lib/github";
import type {
  MergeMethod,
  NormalizedCheck,
  PullMergeStatus,
} from "@/lib/github-types";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  GitBranch,
  Loader2,
  Minus,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

interface PullMergeStatusCardProps {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  isDraft: boolean;
  viewerCanUpdate: boolean;
  headRef: string;
  headRefExists: boolean;
  isCrossRepository: boolean;
  onMerge: (
    mergeMethod: MergeMethod,
    commitTitle?: string,
    commitBody?: string,
  ) => Promise<void>;
  onDeleteBranch: () => Promise<void>;
}

export function PullMergeStatusCard({
  accountId,
  owner,
  repo,
  number,
  title,
  state,
  merged,
  isDraft,
  viewerCanUpdate,
  headRef,
  headRefExists,
  isCrossRepository,
  onMerge,
  onDeleteBranch,
}: PullMergeStatusCardProps) {
  const { data: mergeStatus } = usePullMergeStatus(
    accountId,
    owner,
    repo,
    number,
  );

  if (merged) {
    if (headRefExists && viewerCanUpdate && !isCrossRepository) {
      return <DeleteBranchCard headRef={headRef} onDelete={onDeleteBranch} />;
    }
    return null;
  }

  if (state === "closed") return null;
  if (!mergeStatus) return null;

  return (
    <div className="border rounded-lg divide-y">
      {mergeStatus.checks.length > 0 && (
        <StatusChecksSection
          checks={mergeStatus.checks}
          overallState={mergeStatus.overallState}
        />
      )}
      <MergeRow
        accountId={accountId}
        owner={owner}
        repo={repo}
        number={number}
        title={title}
        mergeStatus={mergeStatus}
        viewerCanUpdate={viewerCanUpdate}
        isDraft={isDraft}
        onMerge={onMerge}
      />
    </div>
  );
}

// Status icon component for individual check statuses
function StatusIcon({
  status,
  className,
}: {
  status: NormalizedCheck["status"];
  className?: string;
}) {
  switch (status) {
    case "success":
      return (
        <Check className={cn("h-4 w-4 text-green-600 shrink-0", className)} />
      );
    case "failure":
    case "timed_out":
    case "startup_failure":
    case "action_required":
      return <X className={cn("h-4 w-4 text-red-600 shrink-0", className)} />;
    case "error":
      return (
        <AlertCircle
          className={cn("h-4 w-4 text-red-600 shrink-0", className)}
        />
      );
    case "pending":
    case "queued":
    case "waiting":
      return (
        <Clock className={cn("h-4 w-4 text-yellow-600 shrink-0", className)} />
      );
    case "in_progress":
      return (
        <Loader2
          className={cn(
            "h-4 w-4 text-blue-600 shrink-0 animate-spin",
            className,
          )}
        />
      );
    case "cancelled":
      return (
        <X
          className={cn("h-4 w-4 text-muted-foreground shrink-0", className)}
        />
      );
    case "neutral":
    case "skipped":
      return (
        <Minus
          className={cn("h-4 w-4 text-muted-foreground shrink-0", className)}
        />
      );
    case "stale":
      return (
        <Clock
          className={cn("h-4 w-4 text-muted-foreground shrink-0", className)}
        />
      );
    default:
      return (
        <Clock
          className={cn("h-4 w-4 text-muted-foreground shrink-0", className)}
        />
      );
  }
}

// Overall status icon for the collapsible trigger
function OverallStateIcon({
  state,
}: {
  state: PullMergeStatus["overallState"];
}) {
  switch (state) {
    case "SUCCESS":
      return <Check className="h-5 w-5 text-green-600 shrink-0" />;
    case "FAILURE":
    case "ERROR":
      return <X className="h-5 w-5 text-red-600 shrink-0" />;
    case "PENDING":
    case "EXPECTED":
      return <Clock className="h-5 w-5 text-yellow-600 shrink-0" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground shrink-0" />;
  }
}

// Sort priority: failures first, then pending/in-progress, then success, then rest
const STATUS_SORT_ORDER: Record<NormalizedCheck["status"], number> = {
  failure: 0,
  error: 0,
  timed_out: 0,
  startup_failure: 0,
  action_required: 0,
  pending: 1,
  queued: 1,
  waiting: 1,
  in_progress: 1,
  success: 2,
  cancelled: 3,
  neutral: 3,
  skipped: 3,
  stale: 3,
};

function StatusChecksSection({
  checks,
  overallState,
}: {
  checks: NormalizedCheck[];
  overallState: PullMergeStatus["overallState"];
}) {
  const [open, setOpen] = useState(false);

  const successCount = checks.filter((c) => c.status === "success").length;
  const total = checks.length;

  const sortedChecks = [...checks].sort((a, b) => {
    const orderDiff =
      (STATUS_SORT_ORDER[a.status] ?? 3) - (STATUS_SORT_ORDER[b.status] ?? 3);
    if (orderDiff !== 0) return orderDiff;
    return a.name.localeCompare(b.name);
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 hover:bg-muted/50 transition-colors text-left">
        <OverallStateIcon state={overallState} />
        <span className="flex-1 text-sm font-medium">
          {successCount} / {total} checks passed
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="divide-y">
          {sortedChecks.map((check, i) => (
            <div
              key={`${check.name}-${i}`}
              className="flex items-center gap-2 px-3 py-2 text-sm"
            >
              <StatusIcon status={check.status} />
              <span className="font-medium truncate min-w-0 shrink">
                {check.name}
              </span>
              {check.description && (
                <span className="text-muted-foreground truncate min-w-0 flex-1">
                  — {check.description}
                </span>
              )}
              {!check.description && <span className="flex-1" />}
              {check.detailsUrl && (
                <button
                  className="text-xs text-blue-600 hover:underline shrink-0 flex items-center gap-1"
                  onClick={() => openInBrowser(check.detailsUrl!)}
                >
                  Details
                  <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function getMergeabilityMessage(
  mergeStateStatus: PullMergeStatus["mergeStateStatus"],
): { message: string; isError: boolean } {
  switch (mergeStateStatus) {
    case "CLEAN":
    case "HAS_HOOKS":
      return {
        message: "This branch has no conflicts with the base branch",
        isError: false,
      };
    case "UNSTABLE":
      return {
        message: "This branch has no conflicts but checks are failing",
        isError: false,
      };
    case "DIRTY":
      return {
        message: "This branch has conflicts that must be resolved",
        isError: true,
      };
    case "BLOCKED":
      return { message: "Merging is blocked", isError: true };
    case "BEHIND":
      return {
        message: "This branch is out-of-date with the base branch",
        isError: false,
      };
    case "DRAFT":
      return { message: "This pull request is still a draft", isError: false };
    case "UNKNOWN":
    default:
      return { message: "Merge status is being calculated...", isError: false };
  }
}

const MERGE_METHOD_LABELS: Record<MergeMethod, string> = {
  merge: "Create a merge commit",
  squash: "Squash and merge",
  rebase: "Rebase and merge",
};

const MERGE_BUTTON_LABELS: Record<MergeMethod, string> = {
  merge: "Merge pull request",
  squash: "Squash and merge",
  rebase: "Rebase and merge",
};

interface CommitInfo {
  message: string;
  author: { login: string; name?: string; email?: string };
}

function buildSquashDefaults(
  title: string,
  number: number,
  commits: CommitInfo[],
  viewerLogin: string,
): { title: string; body: string } {
  const commitTitle = `${title} (#${number})`;

  const bodyLines: string[] = [];
  const coAuthors = new Set<string>();

  for (const commit of commits) {
    // First line of the commit message is the summary
    const lines = commit.message.split("\n");
    bodyLines.push(`+ ${lines[0]}`);

    // Extract Co-authored-by trailers
    for (const line of lines) {
      const match = line.match(/^Co-authored-by:\s*(.+)/i);
      if (match) {
        coAuthors.add(match[1].trim());
      }
    }

    // Derive co-author from commit author metadata (skip viewer's own commits)
    if (
      commit.author.name &&
      commit.author.email &&
      commit.author.login !== viewerLogin
    ) {
      coAuthors.add(`${commit.author.name} <${commit.author.email}>`);
    }
  }

  let body = bodyLines.join("\n");
  if (coAuthors.size > 0) {
    body +=
      "\n\n---\n\n" +
      [...coAuthors].map((a) => `Co-authored-by: ${a}`).join("\n");
  }

  return { title: commitTitle, body };
}

function MergeRow({
  accountId,
  owner,
  repo,
  number,
  title,
  mergeStatus,
  viewerCanUpdate,
  isDraft,
  onMerge,
}: {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
  title: string;
  mergeStatus: PullMergeStatus;
  viewerCanUpdate: boolean;
  isDraft: boolean;
  onMerge: (
    mergeMethod: MergeMethod,
    commitTitle?: string,
    commitBody?: string,
  ) => Promise<void>;
}) {
  const [selectedMethod, setSelectedMethod] = useState<MergeMethod>(
    mergeStatus.defaultMergeMethod,
  );
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSquashForm, setShowSquashForm] = useState(false);
  const [squashTitle, setSquashTitle] = useState("");
  const [squashBody, setSquashBody] = useState("");

  const { data: commitsData } = usePRCommits(accountId, owner, repo, number);

  const commits = useMemo(
    () =>
      commitsData?.pages.flatMap((page) =>
        page.items.map((c) => ({
          message: c.message,
          author: c.author,
        })),
      ) ?? [],
    [commitsData],
  );

  const canMerge = viewerCanUpdate || mergeStatus.viewerCanMergeAsAdmin;
  const { message, isError } = getMergeabilityMessage(
    mergeStatus.mergeStateStatus,
  );

  const isConflicting = mergeStatus.mergeable === "CONFLICTING";
  const isBlocked =
    mergeStatus.mergeStateStatus === "BLOCKED" &&
    !mergeStatus.viewerCanMergeAsAdmin;
  const mergeDisabled = isConflicting || isBlocked || isDraft || isMerging;

  const handleMergeClick = () => {
    if (selectedMethod === "squash") {
      const account = getAccount(accountId);
      const defaults = buildSquashDefaults(
        title,
        number,
        commits,
        account?.login ?? "",
      );
      setSquashTitle(defaults.title);
      setSquashBody(defaults.body);
      setShowSquashForm(true);
      return;
    }
    void doMerge(selectedMethod);
  };

  const doMerge = async (
    method: MergeMethod,
    commitTitle?: string,
    commitBody?: string,
  ) => {
    setIsMerging(true);
    setError(null);
    try {
      await onMerge(method, commitTitle, commitBody);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to merge pull request");
    } finally {
      setIsMerging(false);
    }
  };

  const handleSquashConfirm = () => {
    void doMerge("squash", squashTitle, squashBody);
  };

  const showAdminNote =
    mergeStatus.viewerCanMergeAsAdmin &&
    (mergeStatus.mergeStateStatus === "BLOCKED" ||
      mergeStatus.mergeStateStatus === "UNSTABLE");

  if (showSquashForm) {
    return (
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Squash and merge</span>
        </div>
        <div className="space-y-2">
          <Input
            value={squashTitle}
            onChange={(e) => setSquashTitle(e.target.value)}
            placeholder="Commit message"
          />
          <Textarea
            value={squashBody}
            onChange={(e) => setSquashBody(e.target.value)}
            placeholder="Extended description"
            rows={6}
            className="font-mono text-xs"
          />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSquashForm(false)}
            disabled={isMerging}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSquashConfirm}
            disabled={isMerging || !squashTitle.trim()}
          >
            {isMerging ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : null}
            Confirm squash and merge
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex-1 text-sm",
            isError ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {message}
        </span>
        {canMerge && (
          <>
            {mergeStatus.allowedMergeMethods.length > 1 ? (
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <div className="flex items-center shrink-0">
                  <Button
                    onClick={handleMergeClick}
                    disabled={mergeDisabled}
                    className="rounded-r-none"
                    size="sm"
                  >
                    {isMerging ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    {MERGE_BUTTON_LABELS[selectedMethod]}
                  </Button>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      className="rounded-l-none border-l border-l-primary-foreground/20 px-2"
                      disabled={mergeDisabled}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </div>
                <PopoverContent align="end" className="w-72 space-y-3">
                  <RadioGroup
                    value={selectedMethod}
                    onValueChange={(v) => {
                      setSelectedMethod(v as MergeMethod);
                      setPopoverOpen(false);
                    }}
                  >
                    {mergeStatus.allowedMergeMethods.map((method) => (
                      <div key={method} className="flex items-center gap-2">
                        <RadioGroupItem
                          value={method}
                          id={`merge-method-${method}`}
                        />
                        <Label htmlFor={`merge-method-${method}`}>
                          {MERGE_METHOD_LABELS[method]}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </PopoverContent>
              </Popover>
            ) : (
              <Button
                onClick={handleMergeClick}
                disabled={mergeDisabled}
                size="sm"
                className="shrink-0"
              >
                {isMerging ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                {MERGE_BUTTON_LABELS[selectedMethod]}
              </Button>
            )}
          </>
        )}
      </div>

      {showAdminNote && (
        <p className="text-xs text-muted-foreground">
          As an admin, you can still merge this pull request.
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function DeleteBranchCard({
  headRef,
  onDelete,
}: {
  headRef: string;
  onDelete: () => Promise<void>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
      setDeleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete branch");
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="border rounded-lg p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Trash2 className="h-4 w-4 shrink-0" />
          <span>
            Branch <code className="font-mono text-xs">{headRef}</code> has been
            deleted.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-3">
        <GitBranch className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="flex-1 text-sm text-muted-foreground">
          Pull request successfully merged. The{" "}
          <code className="font-mono text-xs">{headRef}</code> branch can be
          safely deleted.
        </span>
        <Button
          variant="destructive"
          size="sm"
          className="shrink-0"
          onClick={() => setConfirmOpen(true)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Trash2 className="h-4 w-4 mr-1" />
          )}
          Delete branch
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete branch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <strong>{headRef}</strong>{" "}
              branch? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete branch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
