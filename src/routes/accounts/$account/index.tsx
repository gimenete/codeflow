import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accounts/$account/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/accounts/$account/queries/$query",
      params: { account: params.account, query: "my-pulls" },
    });
  },
  component: () => null,
});
