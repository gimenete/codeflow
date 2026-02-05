import { gql } from "graphql-request";

export const GET_REPOSITORY_INFO = gql`
  query GetRepositoryInfo($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      isFork
      defaultBranchRef {
        name
      }
      parent {
        owner {
          login
        }
        name
        defaultBranchRef {
          name
        }
      }
    }
  }
`;

export interface RepositoryInfoResponse {
  repository: {
    isFork: boolean;
    defaultBranchRef: {
      name: string;
    } | null;
    parent: {
      owner: {
        login: string;
      };
      name: string;
      defaultBranchRef: {
        name: string;
      } | null;
    } | null;
  } | null;
}
