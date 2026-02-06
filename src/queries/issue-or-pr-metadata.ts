import { gql } from "graphql-request";

export const GET_ISSUE_OR_PR_METADATA = gql`
  query GetIssueOrPRMetadata($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issueOrPullRequest(number: $number) {
        ... on Issue {
          __typename
          id
          number
          title
          issueState: state
          viewerCanUpdate
          bodyHTML
          createdAt
          updatedAt
          author {
            login
            avatarUrl
          }
          labels(first: 20) {
            nodes {
              name
              color
            }
          }
          assignees(first: 10) {
            nodes {
              login
              avatarUrl
            }
          }
          milestone {
            number
            title
            url
            dueOn
            state
          }
        }
        ... on PullRequest {
          __typename
          id
          number
          title
          prState: state
          viewerCanUpdate
          merged
          isDraft
          bodyHTML
          createdAt
          updatedAt
          additions
          deletions
          changedFiles
          headRefName
          baseRefName
          mergeCommit {
            oid
          }
          isCrossRepository
          headRepository {
            name
            owner {
              login
            }
          }
          author {
            login
            avatarUrl
          }
          labels(first: 20) {
            nodes {
              name
              color
            }
          }
          assignees(first: 10) {
            nodes {
              login
              avatarUrl
            }
          }
          reviewRequests(first: 10) {
            nodes {
              requestedReviewer {
                ... on User {
                  login
                  userAvatarUrl: avatarUrl
                }
                ... on Team {
                  name
                  teamAvatarUrl: avatarUrl
                }
              }
            }
          }
          latestOpinionatedReviews(first: 20) {
            nodes {
              author {
                login
                avatarUrl
              }
              state
            }
          }
          milestone {
            number
            title
            url
            dueOn
            state
          }
          files(first: 100) {
            nodes {
              path
              additions
              deletions
              changeType
            }
          }
          commits(first: 0) {
            totalCount
          }
        }
      }
    }
  }
`;
