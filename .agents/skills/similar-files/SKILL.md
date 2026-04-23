---
name: similar-files
description: "Finds similar files in a codebase using TF-IDF and cosine similarity. First, index a workspace, then find related files."
---

# Similar Files Skill

This skill allows you to find similar files within a codebase using TF-IDF vectorization and cosine similarity. It has two main commands:

1. **index-workspace**: Create an index of files in a directory
2. **find-similar**: Find files similar to a given file or text query

## Installation

### Via skills package (for Claude Code agents)

```bash
npx skills add watthem/similar-files -a claude-code
```

### Via npm (for CLI usage)

```bash
npm install -g @watthem/similar-files
```

## Usage

### If installed via `skills add`

The skill is installed to `~/.claude/skills/similar-files/`. Run the scripts directly:

```bash
# Index the current workspace
node ~/.claude/skills/similar-files/scripts/index-workspace.mjs

# Index a specific directory
node ~/.claude/skills/similar-files/scripts/index-workspace.mjs --root /path/to/project

# Find similar files
node ~/.claude/skills/similar-files/scripts/find-similar.mjs path/to/file.md

# Find by text query
node ~/.claude/skills/similar-files/scripts/find-similar.mjs --text "your search query"
```

### If installed via npm

```bash
# Index the current workspace
similar-index

# Index a specific directory
similar-index --root /path/to/project

# Find similar files
similar-find path/to/file.md

# Find by text query
similar-find --text "your search query"
```

## Commands

### `index-workspace`

Scans your workspace, collects all text-based files, and builds a TF-IDF index. The index is stored in a `.similar-files` directory within your project's root.

**Options:**
- `--root <path>`: Directory to index (defaults to current directory)

### `find-similar`

Finds files similar to a specific file or text query using the pre-built index.

**Options:**
- `--text <query>`: Search by text instead of file path
- `--top <n>`: Number of results to return (default: 10)

## How It Works

1. **Indexing**: The skill reads all text-based files in your workspace and creates TF-IDF vectors for each file
2. **Searching**: When you query, it computes the cosine similarity between your query and all indexed files
3. **Results**: Returns the most similar files ranked by similarity score

## Dependencies

This skill uses [@watthem/quarrel](https://github.com/watthem/quarrel) for TF-IDF vectorization and cosine similarity calculations.
