import { gql } from "graphql-request";

export const GET_ASSIGNABLE_USERS = gql`
  query GetAssignableUsers($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      assignableUsers(first: 100) {
        nodes {
          login
          avatarUrl
        }
      }
    }
  }
`;

export const GET_ORG_TEAMS = gql`
  query GetOrgTeams($org: String!) {
    organization(login: $org) {
      teams(first: 100, orderBy: { field: NAME, direction: ASC }) {
        nodes {
          name
          slug
          avatarUrl
          combinedSlug
        }
      }
    }
  }
`;

/** @deprecated Use GET_ASSIGNABLE_USERS instead */
export const GET_MENTIONABLE_USERS = GET_ASSIGNABLE_USERS;
