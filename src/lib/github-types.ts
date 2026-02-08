import type { TimelineNode } from "@/components/timeline-events";

// Provider types for multi-provider support
export type AccountProvider = "github" | "gitlab" | "bitbucket";
export type AgentType = "claude" | "codex";
export type IssueTracker = "github" | "linear" | "jira";

export interface Account {
  id: string;
  login: string;
  host: string;
  avatarUrl: string;
  token: string;
  provider: AccountProvider;
}

// Backward compatibility alias
export type GitHubAccount = Account;

export interface Label {
  name: string;
  color: string;
}

export interface Author {
  login: string;
  avatarUrl: string;
}

export type MergeMethod = "merge" | "squash" | "rebase";

export interface NormalizedCheck {
  type: "check_run" | "status_context";
  name: string;
  status:
    | "success"
    | "failure"
    | "pending"
    | "in_progress"
    | "neutral"
    | "skipped"
    | "cancelled"
    | "timed_out"
    | "action_required"
    | "stale"
    | "startup_failure"
    | "queued"
    | "waiting"
    | "error";
  description: string | null;
  detailsUrl: string | null;
}

export interface PullMergeStatus {
  pullRequestId: string;
  overallState: "SUCCESS" | "FAILURE" | "PENDING" | "EXPECTED" | "ERROR" | null;
  checks: NormalizedCheck[];
  mergeable: "CONFLICTING" | "MERGEABLE" | "UNKNOWN";
  mergeStateStatus:
    | "BEHIND"
    | "BLOCKED"
    | "CLEAN"
    | "DIRTY"
    | "DRAFT"
    | "HAS_HOOKS"
    | "UNKNOWN"
    | "UNSTABLE";
  viewerCanMergeAsAdmin: boolean;
  reviewDecision: ReviewDecision;
  allowedMergeMethods: MergeMethod[];
  defaultMergeMethod: MergeMethod;
}

export type StatusCheckRollupState =
  | "SUCCESS"
  | "FAILURE"
  | "PENDING"
  | "EXPECTED"
  | null;
export type ReviewDecision =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REVIEW_REQUIRED"
  | null;
export type ReviewState =
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "COMMENTED"
  | "PENDING"
  | "DISMISSED";

export interface Milestone {
  number: number;
  title: string;
  url: string;
  dueOn: string | null;
  state: "OPEN" | "CLOSED";
}

export interface ReviewRequest {
  login?: string;
  name?: string;
  slug?: string;
  avatarUrl: string;
}

export interface SuggestedReviewer {
  isAuthor: boolean;
  isCommenter: boolean;
  reviewer: {
    login: string;
    avatarUrl: string;
  };
}

export interface OrgTeam {
  name: string;
  slug: string;
  avatarUrl: string;
  combinedSlug: string;
}

export interface LatestReview {
  author: Author;
  state: ReviewState;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  isDraft: boolean;
  author: Author;
  labels: Label[];
  repository: string;
  createdAt: string;
  updatedAt: string;
  statusCheckRollup?: StatusCheckRollupState;
  reviewDecision?: ReviewDecision;
}

export interface Issue {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed";
  author: Author;
  labels: Label[];
  repository: string;
  createdAt: string;
  updatedAt: string;
}

// TimelineEvent type is now imported from generated graphql types
// See src/components/timeline-events/types.ts for TimelineNode type

export interface PullRequestDetail {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  author: Author;
  labels: Label[];
  assignees: Author[];
  reviewRequests: ReviewRequest[];
  latestReviews: LatestReview[];
  milestone: Milestone | null;
  repository: string;
  createdAt: string;
  updatedAt: string;
  bodyHTML: string;
  headRef: string;
  baseRef: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  timeline: TimelineNode[];
  commits: Array<{
    sha: string;
    message: string;
    author: Author;
    date: string;
  }>;
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
    status: string;
    patch?: string;
  }>;
}

export interface IssueDetail {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed";
  author: Author;
  labels: Label[];
  assignees: Author[];
  milestone: Milestone | null;
  repository: string;
  createdAt: string;
  updatedAt: string;
  bodyHTML: string;
  timeline: TimelineNode[];
}

export interface LocalRepository {
  id: string;
  name: string;
  path: string;
}

export interface GitFileStatus {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "untracked";
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  tracking: string | null; // e.g., "origin/main" - upstream ref
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
}

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  additions?: number;
  deletions?: number;
}

export interface SavedQuery {
  id: string;
  accountId?: string;
  name: string;
  icon: string;
  filters: QueryFilters;
}

export interface SavedQueryGroup {
  id: string;
  title: string;
  queries: SavedQuery[];
}

export interface QueryFilters {
  type?: "pulls" | "issues";
  repo?: string;
  state?: "open" | "closed" | "merged" | "draft" | "all";
  label?: string[];
  author?: string;
  assignee?: string;
  reviewRequested?: string;
  teamReviewRequested?: string;
  mentioned?: string;
  milestone?: string;
  rawQuery?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface PullRequestMetadata {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  isDraft: boolean;
  viewerCanUpdate: boolean;
  author: Author;
  labels: Label[];
  assignees: Author[];
  reviewRequests: ReviewRequest[];
  suggestedReviewers: SuggestedReviewer[];
  latestReviews: LatestReview[];
  milestone: Milestone | null;
  repository: string;
  createdAt: string;
  updatedAt: string;
  body: string;
  bodyHTML: string;
  headRef: string;
  baseRef: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  totalCommits: number;
  mergeCommitSha: string | null;
  isCrossRepository: boolean;
  headRepositoryOwner: string | null;
  headRepositoryName: string | null;
  headRefExists: boolean;
}

export interface IssueMetadata {
  id: string;
  number: number;
  title: string;
  state: "open" | "closed";
  viewerCanUpdate: boolean;
  author: Author;
  labels: Label[];
  assignees: Author[];
  milestone: Milestone | null;
  repository: string;
  createdAt: string;
  updatedAt: string;
  body: string;
  bodyHTML: string;
}

export interface TimelinePage {
  items: TimelineNode[];
  pageInfo: PageInfo;
}

export interface CommitsPage {
  items: Array<{
    sha: string;
    message: string;
    author: Author;
    date: string;
  }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface PRFileInfo {
  path: string;
  sha: string | null;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  blobUrl: string;
  rawUrl: string;
  contentsUrl: string;
}

export interface PRFilesPage {
  files: PRFileInfo[];
  hasNextPage: boolean;
}

export type DiffSource =
  | { type: "commit"; sha: string }
  | {
      type: "compare";
      base: string;
      head: string;
      headOwner: string | null;
    };

export interface SearchResultsPage {
  items: (PullRequest | Issue)[];
  totalCount: number;
  hasNextPage: boolean;
}

// Repositories feature types
export interface Repository {
  id: string;
  slug: string; // URL-friendly (e.g., "my-repo")
  name: string;
  path: string | null; // Local git repo path (now nullable)
  accountId: string | null; // Renamed from githubAccountId
  remoteUrl: string | null; // Replaces githubOwner/githubRepo
  agent: AgentType; // AI agent selection
  issueTracker: IssueTracker | null; // Issue tracker integration
  worktreesDirectory: string | null; // Directory for git worktrees
  branchPrefix: string | null; // Default prefix for new branch names
  createdAt: string;
  updatedAt: string;
}

export interface TrackedBranch {
  id: string;
  repositoryId: string;
  branch: string; // Git branch name
  worktreePath: string | null; // Optional separate worktree path
  conversationId: string | null;
  pullNumber: number | null; // Associated PR number
  pullOwner: string | null; // Owner of repo where PR lives (parent for forks)
  pullRepo: string | null; // Repo name where PR lives
  createdAt: string;
  updatedAt: string;
}

export interface NotificationInfo {
  threadId: string;
  unread: boolean;
  lastReadAt: string | null;
}

export interface RepositoryForkInfo {
  isFork: boolean;
  defaultBranch: string;
  parent: {
    owner: string;
    name: string;
    defaultBranch: string;
  } | null;
}
