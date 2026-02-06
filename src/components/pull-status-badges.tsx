import { usePullStatus } from "@/lib/github";
import { FileDiffIcon } from "@primer/octicons-react";
import { Check, Clock, Dot, X } from "lucide-react";
import type {
  StatusCheckRollupState,
  ReviewDecision,
} from "@/lib/github-types";

export function PullStatusBadges({
  accountId,
  owner,
  repo,
  number,
}: {
  accountId: string;
  owner: string;
  repo: string;
  number: number;
}) {
  const { data } = usePullStatus(accountId, owner, repo, number);

  if (!data) return null;

  const { statusCheckRollup, reviewDecision } = data;

  if (!statusCheckRollup && !reviewDecision) return null;

  return (
    <div className="flex items-center gap-1">
      <CIStatusIcon status={statusCheckRollup} />
      <ReviewDecisionIcon decision={reviewDecision} />
    </div>
  );
}

function CIStatusIcon({ status }: { status: StatusCheckRollupState }) {
  switch (status) {
    case "SUCCESS":
      return <Check className="h-4 w-4 text-green-600" />;
    case "FAILURE":
      return <X className="h-4 w-4 text-red-600" />;
    case "PENDING":
    case "EXPECTED":
      return <Clock className="h-4 w-4 text-yellow-600" />;
    default:
      return null;
  }
}

function ReviewDecisionIcon({ decision }: { decision: ReviewDecision }) {
  switch (decision) {
    case "APPROVED":
      return <Check className="h-4 w-4 text-green-600" />;
    case "CHANGES_REQUESTED":
      return <FileDiffIcon className="h-4 w-4 text-red-600" />;
    case "REVIEW_REQUIRED":
      return <Dot className="h-4 w-4 text-yellow-600" />;
    default:
      return null;
  }
}
