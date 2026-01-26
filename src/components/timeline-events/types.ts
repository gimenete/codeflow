import type {
  GetIssueTimelineQuery,
  GetPrTimelineQuery,
} from "@/generated/graphql";

// Extract timeline item types from generated queries
type IssueTimelineNodes = NonNullable<
  NonNullable<
    NonNullable<GetIssueTimelineQuery["repository"]>["issue"]
  >["timelineItems"]["nodes"]
>;

type PRTimelineNodes = NonNullable<
  NonNullable<
    NonNullable<GetPrTimelineQuery["repository"]>["pullRequest"]
  >["timelineItems"]["nodes"]
>;

// Union of all possible timeline nodes
export type IssueTimelineNode = NonNullable<IssueTimelineNodes[number]>;
export type PRTimelineNode = NonNullable<PRTimelineNodes[number]>;
export type TimelineNode = IssueTimelineNode | PRTimelineNode;

// Helper type for extracting specific event types
export type ExtractEvent<
  T extends TimelineNode,
  Name extends string,
> = T extends { __typename: Name } ? T : never;

// Common actor type used across events
export type Actor = {
  login: string;
  avatarUrl: string;
} | null;

// Helper to get login from actor
export function getActorLogin(actor: Actor): string {
  return actor?.login ?? "ghost";
}

// Helper to get avatar URL from actor
export function getActorAvatarUrl(actor: Actor): string {
  return actor?.avatarUrl ?? "";
}

// Get display name for reviewer (handles User vs Team vs Bot)
export function getReviewerDisplayInfo(
  reviewer:
    | { __typename?: "User"; login: string; userAvatarUrl: string }
    | { __typename?: "Team"; name: string; teamAvatarUrl?: string | null }
    | { __typename?: "Mannequin"; login: string; mannequinAvatarUrl: string }
    | { __typename?: "Bot" }
    | null
    | undefined,
): { name: string; avatarUrl: string } {
  if (!reviewer) return { name: "unknown", avatarUrl: "" };

  if (reviewer.__typename === "Bot") {
    return { name: "bot", avatarUrl: "" };
  }
  if (reviewer.__typename === "Team") {
    return { name: reviewer.name, avatarUrl: reviewer.teamAvatarUrl ?? "" };
  }
  if (reviewer.__typename === "Mannequin") {
    return { name: reviewer.login, avatarUrl: reviewer.mannequinAvatarUrl };
  }
  // User
  if ("login" in reviewer && "userAvatarUrl" in reviewer) {
    return { name: reviewer.login, avatarUrl: reviewer.userAvatarUrl };
  }
  return { name: "unknown", avatarUrl: "" };
}
