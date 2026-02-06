import { gql } from "graphql-request";

export const GET_PR_STATUS = gql`
  query GetPRStatus($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup {
                state
              }
            }
          }
        }
        reviewDecision
      }
    }
  }
`;

export interface PRStatusResponse {
  repository: {
    pullRequest: {
      commits: {
        nodes: Array<{
          commit: {
            statusCheckRollup: {
              state: "SUCCESS" | "FAILURE" | "PENDING" | "EXPECTED" | "ERROR";
            } | null;
          };
        }>;
      };
      reviewDecision:
        | "APPROVED"
        | "CHANGES_REQUESTED"
        | "REVIEW_REQUIRED"
        | null;
    } | null;
  };
}

export const GET_PR_MERGE_STATUS = gql`
  query GetPRMergeStatus($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      mergeCommitAllowed
      squashMergeAllowed
      rebaseMergeAllowed
      viewerDefaultMergeMethod
      pullRequest(number: $number) {
        id
        mergeable
        mergeStateStatus
        viewerCanMergeAsAdmin
        reviewDecision
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup {
                state
                contexts(first: 100) {
                  nodes {
                    __typename
                    ... on CheckRun {
                      name
                      status
                      conclusion
                      detailsUrl
                      title
                      summary
                    }
                    ... on StatusContext {
                      context
                      state
                      description
                      targetUrl
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export interface CheckRunContext {
  __typename: "CheckRun";
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string | null;
  title: string | null;
  summary: string | null;
}

export interface StatusContextItem {
  __typename: "StatusContext";
  context: string;
  state: string;
  description: string | null;
  targetUrl: string | null;
}

export type CheckContext = CheckRunContext | StatusContextItem;

export interface PRMergeStatusResponse {
  repository: {
    mergeCommitAllowed: boolean;
    squashMergeAllowed: boolean;
    rebaseMergeAllowed: boolean;
    viewerDefaultMergeMethod: "MERGE" | "SQUASH" | "REBASE";
    pullRequest: {
      id: string;
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
      reviewDecision:
        | "APPROVED"
        | "CHANGES_REQUESTED"
        | "REVIEW_REQUIRED"
        | null;
      commits: {
        nodes: Array<{
          commit: {
            statusCheckRollup: {
              state: "SUCCESS" | "FAILURE" | "PENDING" | "EXPECTED" | "ERROR";
              contexts: {
                nodes: CheckContext[];
              };
            } | null;
          };
        }>;
      };
    } | null;
  };
}
