# Codeflow

A next-generation IDE with built-in AI agents, deep Git integration, and GitHub support.

## Features

- **Claude AI Agents** — Get intelligent code analysis, assistance, and agentic workflows powered by Claude directly within the IDE
- **Git Integration** — First-class support for branches, commits, diffs, worktrees, and file change tracking across your local repos
- **Built-in Terminal** — Run commands without leaving the application
- **Workspace Management** — Organize repositories with worktree support
- **GitHub Pull Requests** — Browse, search, and review pull requests with full timeline and diff views
- **GitHub Issues** — View and manage issues across your repositories
- **Multiple GitHub Accounts** — Switch between accounts seamlessly
- **Command Palette** — Quickly navigate anywhere in the app with keyboard shortcuts

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Git](https://git-scm.com/)
- A GitHub account

### Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/gimenete/codeflow.git
   cd codeflow
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the application in development mode:

   ```bash
   npm run dev
   ```

   Or build and run the production version:

   ```bash
   npm start
   ```

### Building for Distribution

Build platform-specific packages:

```bash
npm run build
```

This produces:

- **macOS** — `.dmg`
- **Windows** — NSIS installer
- **Linux** — AppImage

## Usage

### Connecting Your GitHub Account

On first launch, Codeflow will prompt you to authenticate with GitHub. Your credentials are stored securely using your operating system's keychain.

### Managing Repositories

Add local repositories to Codeflow to view branches, commits, and diffs. The app watches your repositories for changes and keeps the UI up to date.

### Reviewing Pull Requests

Search and browse pull requests across your repositories. View the full timeline of events, file diffs, and comments. Save frequently used queries for quick access.

### Using Claude AI

Ask Claude questions about your code, get help understanding diffs, or request analysis of pull request changes. Claude has context about the repository you're working in.

## Keyboard Shortcuts

- **Command Palette** — `Cmd+K` (macOS) / `Ctrl+K` (Windows/Linux)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
