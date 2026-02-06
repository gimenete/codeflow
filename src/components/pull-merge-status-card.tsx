import { useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Minus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { openInBrowser } from "@/lib/actions";
import { usePullMergeStatus } from "@/lib/github";
import type {
  MergeMethod,
  NormalizedCheck,
  PullMergeStatus,
} from "@/lib/github-types";
import { cn } from "@/lib/utils";

interface PullMergeStatusCardProps {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
  state: "open" | "closed";
  merged: boolean;
  isDraft: boolean;
  viewerCanUpdate: boolean;
  onMerge: (mergeMethod: MergeMethod) => Promise<void>;
}

export function PullMergeStatusCard({
  accountId,
  owner,
  repo,
  number,
  state,
  merged,
  isDraft,
  viewerCanUpdate,
  onMerge,
}: PullMergeStatusCardProps) {
  const { data: mergeStatus } = usePullMergeStatus(
    accountId,
    owner,
    repo,
    number,
  );

  if (merged || state === "closed") return null;
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

function MergeRow({
  mergeStatus,
  viewerCanUpdate,
  isDraft,
  onMerge,
}: {
  mergeStatus: PullMergeStatus;
  viewerCanUpdate: boolean;
  isDraft: boolean;
  onMerge: (mergeMethod: MergeMethod) => Promise<void>;
}) {
  const [selectedMethod, setSelectedMethod] = useState<MergeMethod>(
    mergeStatus.defaultMergeMethod,
  );
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canMerge = viewerCanUpdate || mergeStatus.viewerCanMergeAsAdmin;
  const { message, isError } = getMergeabilityMessage(
    mergeStatus.mergeStateStatus,
  );

  const isConflicting = mergeStatus.mergeable === "CONFLICTING";
  const isBlocked =
    mergeStatus.mergeStateStatus === "BLOCKED" &&
    !mergeStatus.viewerCanMergeAsAdmin;
  const mergeDisabled = isConflicting || isBlocked || isDraft || isMerging;

  const handleMerge = async () => {
    setIsMerging(true);
    setError(null);
    try {
      await onMerge(selectedMethod);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to merge pull request");
    } finally {
      setIsMerging(false);
    }
  };

  const showAdminNote =
    mergeStatus.viewerCanMergeAsAdmin &&
    (mergeStatus.mergeStateStatus === "BLOCKED" ||
      mergeStatus.mergeStateStatus === "UNSTABLE");

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
                    onClick={handleMerge}
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
                onClick={handleMerge}
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
