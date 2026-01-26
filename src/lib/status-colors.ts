export const ciStatusColors = {
  success: "bg-green-500",
  failure: "bg-red-500",
  pending: "bg-yellow-500",
} as const;

export const reviewStatusColors = {
  approved: "text-green-500",
  changesRequested: "text-red-500",
  reviewRequired: "text-yellow-500",
} as const;
