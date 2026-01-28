import type { TimelineNode } from "@/components/timeline-events";

export interface GitHubAccount {
  id: string;
  login: string;
  host: string;
  avatarUrl: string;
  token: string;
}

export interface Label {
  name: string;
  color: string;
}

export interface Author {
  login: string;
  avatarUrl: string;
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
  title: string;
  url: string;
  dueOn: string | null;
  state: "OPEN" | "CLOSED";
}

export interface ReviewRequest {
  login?: string;
  name?: string;
  avatarUrl: string;
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
  files: GitFileStatus[];
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
  mentioned?: string;
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
  totalCommits: number;
  mergeCommitSha: string | null;
  isCrossRepository: boolean;
  headRepositoryOwner: string | null;
  headRepositoryName: string | null;
}

export interface IssueMetadata {
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
  path: string; // Local git repo path
  githubAccountId: string | null;
  githubOwner: string | null;
  githubRepo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrackedBranch {
  id: string;
  repositoryId: string;
  branch: string; // Git branch name
  worktreePath: string | null; // Optional separate worktree path
  conversationId: string | null;
  createdAt: string;
  updatedAt: string;
}
