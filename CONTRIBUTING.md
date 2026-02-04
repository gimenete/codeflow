# Contributing to Codeflow

Thank you for your interest in contributing to Codeflow! This guide will help you get set up and familiar with the project.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Git](https://git-scm.com/)
- A GitHub account with a personal access token (optional)

### Development Setup

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/codeflow.git
   cd codeflow
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   This runs Vite and Electron concurrently. The Vite dev server starts on port 5173 and Electron loads from it with hot reload.

## Project Architecture

Codeflow is an Electron application with three distinct processes:

- **Main Process** (`electron/main.ts`) — Handles IPC communication, GitHub API calls, Git operations, Claude AI integration, terminal sessions, and credential management.
- **Preload Script** (`electron/preload.ts`) — Bridges the main and renderer processes securely via `contextBridge`.
- **Renderer Process** (`src/`) — A React 19 application using Vite, TanStack Router (file-based routing), TanStack Query for data fetching, and Zustand for state management.

### Key Directories

```
electron/          # Main process and preload script
src/
├── components/    # React components (ui/, claude/, terminal/, etc.)
├── routes/        # File-based routes (TanStack Router)
├── lib/           # Utilities, API clients, and state stores
├── hooks/         # Custom React hooks
├── queries/       # GraphQL query definitions
└── generated/     # Auto-generated GraphQL types (git-ignored)
```

## Available Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start development server (Vite + Electron) |
| `npm run build`      | Build for production                     |
| `npm start`          | Build and launch production app          |
| `npm run lint`       | Check for lint errors                    |
| `npm run lint:fix`   | Auto-fix lint errors                     |
| `npm run format`     | Format code with Prettier                |
| `npm run format:check` | Check code formatting                  |
| `npm run typecheck`  | Run TypeScript type checking             |
| `npm run codegen`    | Generate GraphQL types                   |

## Code Quality

This project uses several tools to maintain code quality:

- **ESLint** for linting TypeScript and React code
- **Prettier** for consistent formatting
- **Husky** + **lint-staged** for pre-commit hooks that automatically lint and format staged files
- **TypeScript** in strict mode across all processes

Before submitting a pull request, make sure your changes pass all checks:

```bash
npm run lint
npm run format:check
npm run typecheck
```

## Making Changes

1. Create a new branch from `main`:

   ```bash
   git checkout -b my-feature
   ```

2. Make your changes and verify they work with `npm run dev`.

3. Ensure your code passes all quality checks (linting, formatting, type checking).

4. Commit your changes. The pre-commit hook will automatically lint and format staged files.

5. Push your branch and open a pull request.

## Conventions

- **Naming** — Use "pull" instead of "pr" when referring to pull requests in code.
- **Dates** — Use relative dates (e.g., "2 hours ago") rather than absolute timestamps.
- **IPC** — All communication between renderer and main processes must go through the preload bridge.

## Reporting Issues

If you find a bug or have a feature request, please [open an issue](https://github.com/gimenete/codeflow/issues) with a clear description and steps to reproduce.

## License

By contributing to Codeflow, you agree that your contributions will be licensed under the [MIT License](LICENSE).
