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
