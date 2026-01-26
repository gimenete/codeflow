import { gql } from "graphql-request";

export const SEARCH_WITH_CURSORS = gql`
  query SearchWithCursors(
    $query: String!
    $first: Int
    $after: String
    $last: Int
    $before: String
  ) {
    search(
      query: $query
      type: ISSUE
      first: $first
      after: $after
      last: $last
      before: $before
    ) {
      edges {
        cursor
        node {
          ... on Issue {
            number
            title
            repository {
              owner {
                login
              }
              name
            }
          }
          ... on PullRequest {
            number
            title
            repository {
              owner {
                login
              }
              name
            }
          }
        }
      }
    }
  }
`;

export interface SearchNavigationItem {
  cursor: string;
  number: number;
  title: string;
  owner: string;
  repo: string;
}

export interface SearchNavigationResponse {
  search: {
    edges: Array<{
      cursor: string;
      node: {
        number: number;
        title: string;
        repository: {
          owner: { login: string };
          name: string;
        };
      } | null;
    }>;
  };
}
