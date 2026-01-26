# CLAUDE.md

This file provides guidance for Claude Code when working with this repository.

## Development Commands

```bash
# Start development server (Vite + Electron concurrently)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
npm run lint:fix

# Format code
npm run format
npm run format:check

# Type checking
npm run typecheck

# Generate GraphQL types
npm run codegen

# Build and start production app
npm run start
```

## Architecture Overview

Codeflow is a desktop application built with **Electron + React** for viewing GitHub pull requests and managing local repositories with Claude AI integration.

### Process Architecture

- **Main Process** (`electron/main.ts`) - Electron main process handling IPC, GitHub API, Git operations, and Claude AI integration
- **Preload** (`electron/preload.ts`) - Exposes secure IPC bridge to renderer via `contextBridge`
- **Renderer** (`src/`) - React application using Vite for bundling

### Key Patterns

- **IPC Communication** - All main/renderer communication goes through the preload bridge
- **State Management** - Zustand stores for local state (`src/lib/*-store.ts`)
- **Data Fetching** - TanStack Query for GitHub API data, GraphQL for complex queries
- **Routing** - TanStack Router with file-based routing (`src/routes/`)

## Key Technologies

- **Electron** - Desktop application framework
- **React 19** with React Compiler (babel-plugin-react-compiler)
- **TypeScript** - Full type safety across main and renderer
- **Vite** - Build tool and dev server for renderer
- **TanStack Router** - File-based routing with type safety
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Radix UI** - Headless UI primitives (via `src/components/ui/`)
- **Tailwind CSS v4** - Styling
- **Octokit** - GitHub REST and GraphQL APIs
- **simple-git** - Git operations
- **Claude Agent SDK** - AI integration

## Code Organization

```
electron/           # Electron main process
  main.ts          # Main process entry, IPC handlers
  preload.ts       # Context bridge for renderer

src/
  components/      # React components
    ui/           # Radix-based UI primitives (shadcn/ui style)
    claude/       # Claude AI chat components
    timeline-events/ # PR timeline event renderers
  lib/            # Utilities and business logic
    github.ts     # GitHub API client
    git.ts        # Git operations via IPC
    *-store.ts    # Zustand stores
  routes/         # TanStack Router pages
    __root.tsx    # Root layout
    index.tsx     # Home page (PR search)
    claude.tsx    # Claude AI chat page
    $account/     # Account-specific routes
    git/          # Local git repository routes
  queries/        # GraphQL query definitions
  generated/      # Auto-generated GraphQL types
```

## Additional Notes

- Credentials are stored securely using `keytar`
- GitHub authentication supports multiple accounts
- The app can work with both GitHub.com and local Git repositories
- Pre-commit hooks run ESLint and Prettier via Husky + lint-staged

### Layout

The dimensions of the DOM document are limited to the dimensions of the application window. This is done in purpose to make the app feel like a desktop app, not a web app. Anything that may overflow the window should be scrollable within the window, not by expanding the window size.

## Dates

- Always use the <RelativeTime /> component for displaying dates in the UI.

## Error Handling

- Always surface errors to the user. Don't silently fail and don't show blank states when an error occurs.

## Naming convention

- Prefer to use `pull` over `pr` in code and UI for clarity.
