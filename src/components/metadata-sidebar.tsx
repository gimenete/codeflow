import { AssigneePicker } from "@/components/assignee-picker";
import { GitHubLabel } from "@/components/github-label";
import { LabelPicker } from "@/components/label-picker";
import { MilestonePicker } from "@/components/milestone-picker";
import { RelativeTime } from "@/components/relative-time";
import { ReviewerPicker } from "@/components/reviewer-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type {
  Author,
  IssueMetadata,
  LatestReview,
  Milestone,
  PullRequestMetadata,
  ReviewRequest,
} from "@/lib/github-types";
import {
  Check,
  Clock,
  MessageSquare,
  Milestone as MilestoneIcon,
  Tag,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { UserLogin } from "@/components/user-info";
import { Scrollable } from "./flex-layout";

interface MetadataSidebarProps {
  data: PullRequestMetadata | IssueMetadata;
  isPR: boolean;
  asSheet?: boolean;
  accountId?: string;
  owner?: string;
  repo?: string;
  onLabelsChange?: (labels: string[]) => Promise<void>;
  onAssigneesChange?: (add: string[], remove: string[]) => Promise<void>;
  onReviewRequestsChange?: (
    addUsers: string[],
    removeUsers: string[],
    addTeamSlugs?: string[],
    removeTeamSlugs?: string[],
  ) => Promise<void>;
  onMilestoneChange?: (milestoneNumber: number | null) => Promise<void>;
}

export function MetadataSidebar({
  data,
  isPR,
  asSheet = false,
  accountId,
  owner,
  repo,
  onLabelsChange,
  onAssigneesChange,
  onReviewRequestsChange,
  onMilestoneChange,
}: MetadataSidebarProps) {
  const prData = isPR ? (data as PullRequestMetadata) : null;
  const containerClasses = asSheet ? "h-full" : "border-l";
  const canEdit = data.viewerCanUpdate && accountId && owner && repo;

  return (
    <Scrollable.Vertical className={containerClasses}>
      <div className="p-4 space-y-4">
        {/* Assignees */}
        <SidebarSection title="Assignees" icon={<Users className="h-4 w-4" />}>
          {canEdit && onAssigneesChange ? (
            <AssigneePicker
              accountId={accountId}
              owner={owner}
              repo={repo}
              currentAssignees={data.assignees}
              onAssigneesChange={onAssigneesChange}
            >
              {(displayAssignees) => (
                <button className="w-full text-left rounded-md p-1 -m-1 hover:bg-accent transition-colors cursor-pointer">
                  {displayAssignees.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      None — click to add
                    </span>
                  ) : (
                    <div className="space-y-2">
                      {displayAssignees.map((assignee) => (
                        <UserItem key={assignee.login} user={assignee} accountId={accountId} />
                      ))}
                    </div>
                  )}
                </button>
              )}
            </AssigneePicker>
          ) : data.assignees.length === 0 ? (
            <span className="text-sm text-muted-foreground">None</span>
          ) : (
            <div className="space-y-2">
              {data.assignees.map((assignee) => (
                <UserItem key={assignee.login} user={assignee} accountId={accountId} />
              ))}
            </div>
          )}
        </SidebarSection>
        <Separator />
        {/* Labels */}
        <SidebarSection title="Labels" icon={<Tag className="h-4 w-4" />}>
          {canEdit && onLabelsChange ? (
            <LabelPicker
              accountId={accountId}
              owner={owner}
              repo={repo}
              currentLabels={data.labels}
              onLabelsChange={onLabelsChange}
            >
              {(displayLabels) => (
                <button className="w-full text-left rounded-md p-1 -m-1 hover:bg-accent transition-colors cursor-pointer">
                  {displayLabels.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      None — click to add
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {displayLabels.map((label) => (
                        <GitHubLabel
                          key={label.name}
                          name={label.name}
                          color={label.color}
                        />
                      ))}
                    </div>
                  )}
                </button>
              )}
            </LabelPicker>
          ) : data.labels.length === 0 ? (
            <span className="text-sm text-muted-foreground">None</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {data.labels.map((label) => (
                <GitHubLabel
                  key={label.name}
                  name={label.name}
                  color={label.color}
                />
              ))}
            </div>
          )}
        </SidebarSection>
        {/* PR-only sections */}
        {isPR && prData && (
          <>
            <Separator />

            {/* Reviewers */}
            <SidebarSection
              title="Reviewers"
              icon={<UserCheck className="h-4 w-4" />}
            >
              {prData.latestReviews.length === 0 ? (
                <span className="text-sm text-muted-foreground">None</span>
              ) : (
                <div className="space-y-2">
                  {prData.latestReviews.map((review) => (
                    <ReviewerItem key={review.author.login} review={review} accountId={accountId} />
                  ))}
                </div>
              )}
            </SidebarSection>

            <Separator />

            {/* Review Requested */}
            <SidebarSection
              title="Review Requested"
              icon={<Clock className="h-4 w-4" />}
            >
              {canEdit && onReviewRequestsChange ? (
                <ReviewerPicker
                  accountId={accountId}
                  owner={owner}
                  repo={repo}
                  currentRequests={prData.reviewRequests}
                  suggestedReviewers={prData.suggestedReviewers}
                  onReviewRequestsChange={onReviewRequestsChange}
                >
                  {(displayRequests) => (
                    <button className="w-full text-left rounded-md p-1 -m-1 hover:bg-accent transition-colors cursor-pointer">
                      {displayRequests.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          None — click to add
                        </span>
                      ) : (
                        <div className="space-y-2">
                          {displayRequests.map((request, index) => (
                            <ReviewRequestItem
                              key={request.login ?? request.name ?? index}
                              request={request}
                              accountId={accountId}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  )}
                </ReviewerPicker>
              ) : prData.reviewRequests.length === 0 ? (
                <span className="text-sm text-muted-foreground">None</span>
              ) : (
                <div className="space-y-2">
                  {prData.reviewRequests.map((request, index) => (
                    <ReviewRequestItem
                      key={request.login ?? request.name ?? index}
                      request={request}
                      accountId={accountId}
                    />
                  ))}
                </div>
              )}
            </SidebarSection>
          </>
        )}
        <Separator />
        {/* Milestone */}
        <SidebarSection
          title="Milestone"
          icon={<MilestoneIcon className="h-4 w-4" />}
        >
          {canEdit && onMilestoneChange ? (
            <MilestonePicker
              accountId={accountId}
              owner={owner}
              repo={repo}
              currentMilestone={data.milestone}
              onMilestoneChange={onMilestoneChange}
            >
              {(displayMilestone) => (
                <button className="w-full text-left rounded-md p-1 -m-1 hover:bg-accent transition-colors cursor-pointer">
                  {displayMilestone ? (
                    <MilestoneItem milestone={displayMilestone} />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      None — click to add
                    </span>
                  )}
                </button>
              )}
            </MilestonePicker>
          ) : data.milestone ? (
            <MilestoneItem milestone={data.milestone} />
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
        </SidebarSection>
      </div>
    </Scrollable.Vertical>
  );
}

interface SidebarSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SidebarSection({ title, icon, children }: SidebarSectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function UserItem({
  user,
  accountId,
}: {
  user: Author;
  accountId?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-5 w-5">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback>{user.login.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <UserLogin login={user.login} accountId={accountId}>
        <span className="text-sm truncate">{user.login}</span>
      </UserLogin>
    </div>
  );
}

function ReviewerItem({
  review,
  accountId,
}: {
  review: LatestReview;
  accountId?: string;
}) {
  const getReviewIcon = () => {
    switch (review.state) {
      case "APPROVED":
        return <Check className="h-4 w-4 text-green-500" />;
      case "CHANGES_REQUESTED":
        return <X className="h-4 w-4 text-red-500" />;
      case "COMMENTED":
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
      case "DISMISSED":
        return <X className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getReviewLabel = () => {
    switch (review.state) {
      case "APPROVED":
        return "Approved";
      case "CHANGES_REQUESTED":
        return "Changes requested";
      case "COMMENTED":
        return "Commented";
      case "DISMISSED":
        return "Dismissed";
      default:
        return "Pending";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-5 w-5">
        <AvatarImage src={review.author.avatarUrl} />
        <AvatarFallback>
          {review.author.login.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <UserLogin login={review.author.login} accountId={accountId}>
        <span className="text-sm truncate flex-1">{review.author.login}</span>
      </UserLogin>
      <span title={getReviewLabel()}>{getReviewIcon()}</span>
    </div>
  );
}

function ReviewRequestItem({
  request,
  accountId,
}: {
  request: ReviewRequest;
  accountId?: string;
}) {
  const displayName = request.login ?? request.name ?? "Unknown";

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-5 w-5">
        <AvatarImage src={request.avatarUrl} />
        <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <UserLogin login={displayName} accountId={accountId}>
        <span className="text-sm truncate">{displayName}</span>
      </UserLogin>
    </div>
  );
}

function MilestoneItem({ milestone }: { milestone: Milestone }) {
  return (
    <div className="space-y-1">
      <div className="text-sm font-medium">{milestone.title}</div>
      {milestone.dueOn && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Due <RelativeTime date={milestone.dueOn} />
        </div>
      )}
      {milestone.state === "CLOSED" && (
        <div className="text-xs text-muted-foreground">Closed</div>
      )}
    </div>
  );
}
