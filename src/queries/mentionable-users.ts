import { gql } from "graphql-request";

export const GET_MENTIONABLE_USERS = gql`
  query GetMentionableUsers($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      mentionableUsers(first: 8) {
        nodes {
          login
          avatarUrl
        }
      }
    }
  }
`;
