import {
  Check,
  X,
  MessageSquare,
  Clock,
  Users,
  Tag,
  UserCheck,
  Milestone as MilestoneIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitHubLabel } from "@/components/github-label";
import { RelativeTime } from "@/components/relative-time";
import type {
  PullRequestMetadata,
  IssueMetadata,
  LatestReview,
  ReviewRequest,
  Author,
  Milestone,
} from "@/lib/github-types";

interface MetadataSidebarProps {
  data: PullRequestMetadata | IssueMetadata;
  isPR: boolean;
  asSheet?: boolean;
}

export function MetadataSidebar({
  data,
  isPR,
  asSheet = false,
}: MetadataSidebarProps) {
  const prData = isPR ? (data as PullRequestMetadata) : null;
  const containerClasses = asSheet ? "h-full" : "w-64 border-l h-full";

  return (
    <ScrollArea className={containerClasses}>
      <div className="p-4 space-y-4">
        {/* Assignees */}
        <SidebarSection title="Assignees" icon={<Users className="h-4 w-4" />}>
          {data.assignees.length === 0 ? (
            <span className="text-sm text-muted-foreground">None</span>
          ) : (
            <div className="space-y-2">
              {data.assignees.map((assignee) => (
                <UserItem key={assignee.login} user={assignee} />
              ))}
            </div>
          )}
        </SidebarSection>

        <Separator />

        {/* Labels */}
        <SidebarSection title="Labels" icon={<Tag className="h-4 w-4" />}>
          {data.labels.length === 0 ? (
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
                    <ReviewerItem key={review.author.login} review={review} />
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
              {prData.reviewRequests.length === 0 ? (
                <span className="text-sm text-muted-foreground">None</span>
              ) : (
                <div className="space-y-2">
                  {prData.reviewRequests.map((request, index) => (
                    <ReviewRequestItem
                      key={request.login ?? request.name ?? index}
                      request={request}
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
          {data.milestone ? (
            <MilestoneItem milestone={data.milestone} />
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
        </SidebarSection>
      </div>
    </ScrollArea>
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

function UserItem({ user }: { user: Author }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-5 w-5">
        <AvatarImage src={user.avatarUrl} />
        <AvatarFallback>{user.login.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm truncate">{user.login}</span>
    </div>
  );
}

function ReviewerItem({ review }: { review: LatestReview }) {
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
      <span className="text-sm truncate flex-1">{review.author.login}</span>
      <span title={getReviewLabel()}>{getReviewIcon()}</span>
    </div>
  );
}

function ReviewRequestItem({ request }: { request: ReviewRequest }) {
  const displayName = request.login ?? request.name ?? "Unknown";

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-5 w-5">
        <AvatarImage src={request.avatarUrl} />
        <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm truncate">{displayName}</span>
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
