import { RelativeTime } from "@/components/relative-time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserLogin } from "@/components/user-info";
import { PersonAddIcon, PersonIcon, XCircleIcon } from "@primer/octicons-react";
import { TimelineEventWrapper } from "./timeline-event-wrapper";
import {
  getActorLogin,
  getActorAvatarUrl,
  getReviewerDisplayInfo,
  type Actor,
} from "./types";

type RequestedReviewer =
  | { __typename?: "User"; login: string; userAvatarUrl: string }
  | { __typename?: "Team"; name: string; teamAvatarUrl?: string | null }
  | { __typename?: "Mannequin"; login: string; mannequinAvatarUrl: string }
  | { __typename?: "Bot" }
  | null
  | undefined;

// Review Requested Event
interface ReviewRequestedEventProps {
  actor: Actor;
  createdAt: string;
  requestedReviewer: RequestedReviewer;
  accountId?: string;
}

export function ReviewRequestedEvent({
  actor,
  createdAt,
  requestedReviewer,
  accountId,
}: ReviewRequestedEventProps) {
  const actorLogin = getActorLogin(actor);
  const actorAvatarUrl = getActorAvatarUrl(actor);
  const reviewerInfo = getReviewerDisplayInfo(requestedReviewer);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <PersonAddIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={actorAvatarUrl} />
          <AvatarFallback>{actorLogin.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={actorLogin} accountId={accountId}>
          <span>{actorLogin}</span>
        </UserLogin>
        <span>requested a review from</span>
        <Avatar className="h-5 w-5">
          <AvatarImage src={reviewerInfo.avatarUrl} />
          <AvatarFallback>
            {reviewerInfo.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <UserLogin login={reviewerInfo.name} accountId={accountId}>
          <span className="font-medium">{reviewerInfo.name}</span>
        </UserLogin>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Review Request Removed Event
interface ReviewRequestRemovedEventProps {
  actor: Actor;
  createdAt: string;
  requestedReviewer: RequestedReviewer;
  accountId?: string;
}

export function ReviewRequestRemovedEvent({
  actor,
  createdAt,
  requestedReviewer,
  accountId,
}: ReviewRequestRemovedEventProps) {
  const actorLogin = getActorLogin(actor);
  const actorAvatarUrl = getActorAvatarUrl(actor);
  const reviewerInfo = getReviewerDisplayInfo(requestedReviewer);

  return (
    <TimelineEventWrapper>
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <PersonIcon size={16} />
        <Avatar className="h-5 w-5">
          <AvatarImage src={actorAvatarUrl} />
          <AvatarFallback>{actorLogin.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <UserLogin login={actorLogin} accountId={accountId}>
          <span>{actorLogin}</span>
        </UserLogin>
        <span>removed review request from</span>
        <UserLogin login={reviewerInfo.name} accountId={accountId}>
          <span className="font-medium">{reviewerInfo.name}</span>
        </UserLogin>
        <span>
          <RelativeTime date={createdAt} />
        </span>
      </div>
    </TimelineEventWrapper>
  );
}

// Review Dismissed Event
interface ReviewDismissedEventProps {
  actor: Actor;
  createdAt: string;
  dismissalMessage?: string | null;
  review?: { author?: Actor } | null;
  accountId?: string;
}

export function ReviewDismissedEvent({
  actor,
  createdAt,
  dismissalMessage,
  review,
  accountId,
}: ReviewDismissedEventProps) {
  const actorLogin = getActorLogin(actor);
  const actorAvatarUrl = getActorAvatarUrl(actor);
  const reviewAuthor = review?.author
    ? getActorLogin(review.author)
    : "unknown";

  return (
    <TimelineEventWrapper>
      <div className="flex items-start gap-2 text-sm text-muted-foreground py-2">
        <XCircleIcon size={16} className="mt-0.5" />
        <div>
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={actorAvatarUrl} />
              <AvatarFallback>
                {actorLogin.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <UserLogin login={actorLogin} accountId={accountId}>
              <span>{actorLogin}</span>
            </UserLogin>
            <span>dismissed</span>
            <UserLogin login={reviewAuthor} accountId={accountId}>
              <span className="font-medium">{reviewAuthor}&apos;s</span>
            </UserLogin>
            <span>review</span>
            <span>
              <RelativeTime date={createdAt} />
            </span>
          </div>
          {dismissalMessage && (
            <p className="mt-1 text-muted-foreground italic">
              {dismissalMessage}
            </p>
          )}
        </div>
      </div>
    </TimelineEventWrapper>
  );
}
