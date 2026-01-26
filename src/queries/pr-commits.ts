import { gql } from "graphql-request";

export const GET_PR_COMMITS = gql`
  query GetPRCommits(
    $owner: String!
    $repo: String!
    $number: Int!
    $first: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        commits(first: $first, after: $after) {
          totalCount
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            commit {
              oid
              message
              author {
                name
                avatarUrl
                user {
                  login
                }
              }
              committedDate
            }
          }
        }
      }
    }
  }
`;
