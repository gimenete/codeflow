import { gql } from "graphql-request";

export const GET_ISSUE_OR_PR = gql`
  query GetIssueOrPR($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issueOrPullRequest(number: $number) {
        ... on Issue {
          __typename
          id
          number
          title
          issueState: state
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
            title
            url
            dueOn
            state
          }
          timelineItems(first: 100) {
            nodes {
              __typename
              ... on IssueComment {
                author {
                  login
                  avatarUrl
                }
                bodyHTML
                createdAt
              }
              ... on LabeledEvent {
                actor {
                  login
                  avatarUrl
                }
                createdAt
                label {
                  name
                  color
                }
              }
              ... on UnlabeledEvent {
                actor {
                  login
                  avatarUrl
                }
                createdAt
                label {
                  name
                  color
                }
              }
              ... on ClosedEvent {
                actor {
                  login
                  avatarUrl
                }
                createdAt
              }
              ... on ReopenedEvent {
                actor {
                  login
                  avatarUrl
                }
                createdAt
              }
            }
          }
        }
        ... on PullRequest {
          __typename
          id
          number
          title
          prState: state
          merged
          bodyHTML
          createdAt
          updatedAt
          additions
          deletions
          changedFiles
          headRefName
          baseRefName
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
            title
            url
            dueOn
            state
          }
          commits(first: 100) {
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
          files(first: 100) {
            nodes {
              path
              additions
              deletions
              changeType
            }
          }
          timelineItems(first: 100) {
            nodes {
              __typename
              ... on IssueComment {
                author {
                  login
                  avatarUrl
                }
                bodyHTML
                createdAt
              }
              ... on PullRequestReview {
                author {
                  login
                  avatarUrl
                }
                bodyHTML
                state
                createdAt
              }
              ... on PullRequestCommit {
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
              ... on LabeledEvent {
                actor {
                  login
                  avatarUrl
                }
                createdAt
                label {
                  name
                  color
                }
              }
              ... on UnlabeledEvent {
                actor {
                  login
                  avatarUrl
                }
                createdAt
                label {
                  name
                  color
                }
              }
              ... on MergedEvent {
                actor {
                  login
                  avatarUrl
                }
                createdAt
              }
              ... on ClosedEvent {
                actor {
                  login
                  avatarUrl
                }
                createdAt
              }
            }
          }
        }
      }
    }
  }
`;
