import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "https://docs.github.com/public/fpt/schema.docs.graphql",
  documents: ["src/queries/**/*.ts"],
  generates: {
    "src/generated/graphql.ts": {
      plugins: [
        {
          add: {
            content:
              "/* eslint-disable @typescript-eslint/no-explicit-any */\n/* eslint-disable no-irregular-whitespace */",
          },
        },
        "typescript",
        "typescript-operations",
      ],
      config: {
        avoidOptionals: false,
        maybeValue: "T | null | undefined",
        scalars: {
          DateTime: "string",
          URI: "string",
          HTML: "string",
          GitObjectID: "string",
        },
      },
    },
  },
};

export default config;
