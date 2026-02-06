import { gql } from "graphql-request";

export const GET_ISSUE_TIMELINE = gql`
  query GetIssueTimeline(
    $owner: String!
    $repo: String!
    $number: Int!
    $first: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        timelineItems(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            __typename
            ... on IssueComment {
              id
              author {
                login
                avatarUrl
              }
              bodyHTML
              createdAt
            }
            ... on ClosedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              stateReason
            }
            ... on ReopenedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on LockedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              lockReason
            }
            ... on UnlockedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on LabeledEvent {
              id
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
              id
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
            ... on AssignedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              assignee {
                ... on User {
                  login
                  avatarUrl
                }
                ... on Bot {
                  login
                  avatarUrl
                }
                ... on Mannequin {
                  login
                  avatarUrl
                }
              }
            }
            ... on UnassignedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              assignee {
                ... on User {
                  login
                  avatarUrl
                }
                ... on Bot {
                  login
                  avatarUrl
                }
                ... on Mannequin {
                  login
                  avatarUrl
                }
              }
            }
            ... on MilestonedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              milestoneTitle
            }
            ... on DemilestonedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              milestoneTitle
            }
            ... on RenamedTitleEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              previousTitle
              currentTitle
            }
            ... on CrossReferencedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              source {
                __typename
                ... on Issue {
                  number
                  title
                  issueState: state
                  repository {
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  number
                  title
                  prState: state
                  repository {
                    nameWithOwner
                  }
                }
              }
              isCrossRepository
            }
            ... on ReferencedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              referencedCommit: commit {
                oid
                message
              }
              isCrossRepository
            }
            ... on MarkedAsDuplicateEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              canonical {
                ... on Issue {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
            ... on UnmarkedAsDuplicateEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on TransferredEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              fromRepository {
                nameWithOwner
              }
            }
            ... on ConvertedToDiscussionEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on PinnedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on UnpinnedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on ConnectedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              subject {
                ... on Issue {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
            ... on DisconnectedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              subject {
                ... on Issue {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
            ... on CommentDeletedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              deletedCommentAuthor {
                login
              }
            }
            ... on MentionedEvent {
              id
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
`;

export const GET_PR_TIMELINE = gql`
  query GetPRTimeline(
    $owner: String!
    $repo: String!
    $number: Int!
    $first: Int!
    $after: String
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        timelineItems(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            __typename
            ... on IssueComment {
              id
              author {
                login
                avatarUrl
              }
              bodyHTML
              createdAt
            }
            ... on PullRequestReview {
              id
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
            ... on ClosedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              stateReason
            }
            ... on ReopenedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on MergedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              mergeRefName
            }
            ... on LockedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              lockReason
            }
            ... on UnlockedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on LabeledEvent {
              id
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
              id
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
            ... on AssignedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              assignee {
                ... on User {
                  login
                  avatarUrl
                }
                ... on Bot {
                  login
                  avatarUrl
                }
                ... on Mannequin {
                  login
                  avatarUrl
                }
              }
            }
            ... on UnassignedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              assignee {
                ... on User {
                  login
                  avatarUrl
                }
                ... on Bot {
                  login
                  avatarUrl
                }
                ... on Mannequin {
                  login
                  avatarUrl
                }
              }
            }
            ... on MilestonedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              milestoneTitle
            }
            ... on DemilestonedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              milestoneTitle
            }
            ... on RenamedTitleEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              previousTitle
              currentTitle
            }
            ... on CrossReferencedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              source {
                __typename
                ... on Issue {
                  number
                  title
                  issueState: state
                  repository {
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  number
                  title
                  prState: state
                  repository {
                    nameWithOwner
                  }
                }
              }
              isCrossRepository
            }
            ... on ReferencedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              referencedCommit: commit {
                oid
                message
              }
              isCrossRepository
            }
            ... on ReviewRequestedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              requestedReviewer {
                ... on User {
                  login
                  userAvatarUrl: avatarUrl
                }
                ... on Team {
                  name
                  teamAvatarUrl: avatarUrl
                }
                ... on Mannequin {
                  login
                  mannequinAvatarUrl: avatarUrl
                }
              }
            }
            ... on ReviewRequestRemovedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              requestedReviewer {
                ... on User {
                  login
                  userAvatarUrl: avatarUrl
                }
                ... on Team {
                  name
                  teamAvatarUrl: avatarUrl
                }
                ... on Mannequin {
                  login
                  mannequinAvatarUrl: avatarUrl
                }
              }
            }
            ... on ReviewDismissedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              dismissalMessage
              review {
                author {
                  login
                  avatarUrl
                }
              }
            }
            ... on HeadRefForcePushedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              beforeCommit {
                oid
                abbreviatedOid
              }
              afterCommit {
                oid
                abbreviatedOid
              }
            }
            ... on HeadRefDeletedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              headRefName
            }
            ... on HeadRefRestoredEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on BaseRefChangedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              previousRefName
              currentRefName
            }
            ... on BaseRefForcePushedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              beforeCommit {
                oid
                abbreviatedOid
              }
              afterCommit {
                oid
                abbreviatedOid
              }
            }
            ... on ConvertToDraftEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on ReadyForReviewEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on AutoMergeEnabledEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              enabler {
                login
                avatarUrl
              }
            }
            ... on AutoMergeDisabledEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              disabler {
                login
                avatarUrl
              }
            }
            ... on MarkedAsDuplicateEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              canonical {
                ... on Issue {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
            ... on UnmarkedAsDuplicateEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on TransferredEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              fromRepository {
                nameWithOwner
              }
            }
            ... on ConvertedToDiscussionEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on PinnedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on UnpinnedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
            }
            ... on ConnectedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              subject {
                ... on Issue {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
            ... on DisconnectedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              subject {
                ... on Issue {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  number
                  title
                  repository {
                    nameWithOwner
                  }
                }
              }
            }
            ... on CommentDeletedEvent {
              id
              actor {
                login
                avatarUrl
              }
              createdAt
              deletedCommentAuthor {
                login
              }
            }
            ... on MentionedEvent {
              id
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
`;
