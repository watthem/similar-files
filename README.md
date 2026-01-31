# @watthem/similar-files

TF-IDF similarity search for codebase files. Index a workspace and find related files using cosine similarity.

Powered by [@watthem/quarrel](https://github.com/watthem/quarrel).

## Installation

```bash
npm install -g @watthem/similar-files
```

## Quick Start

```bash
# Index current directory
similar-index

# Find files similar to a specific file
similar-find README.md

# Find files similar to text
similar-find --text "authentication middleware"
```

## Commands

### `similar-index`

Build a TF-IDF index for workspace files.

```bash
similar-index [options]

Options:
  --root, -r <path>    Workspace root directory (default: current directory)
  --index, -i <path>   Custom index directory (default: <root>/.similar-files)
  --help, -h           Show help
```

Examples:

```bash
similar-index                               # Index current directory
similar-index --root /path/to/project       # Index specific directory
similar-index -r . -i ~/.my-indexes/proj    # Custom index location
```

### `similar-find`

Find related files using the pre-built index.

```bash
similar-find <file-path>        Find files similar to a file
similar-find --text "query"     Find files similar to text

Options:
  --text, -t <text>     Search using text instead of a file
  --top, -n <count>     Number of results (default: 10)
  --threshold <value>   Minimum similarity score (default: 0.1)
  --index, -i <path>    Custom index directory
  --json                Output as JSON
  --help, -h            Show help
```

Examples:

```bash
similar-find README.md
similar-find --text "data validation schema"
similar-find --top 5 --threshold 0.2 docs/architecture.md
similar-find -i ~/.my-indexes/proj src/main.ts
```

## File Types Indexed

- `.md` - Markdown documentation
- `.ts`, `.tsx` - TypeScript
- `.js`, `.jsx` - JavaScript
- `.py` - Python
- `.rs` - Rust
- `.go` - Go

## Excluded Directories

`node_modules`, `venv`, `.venv`, `target`, `.git`, `dist`, `build`, `__pycache__`, `.pnpm-store`, `.netlify`, `archives`, `.next`, `.cache`, `coverage`

## Example Output

```
Similar files to: src/auth/middleware.ts
Workspace: /home/user/myproject

1. src/auth/session.ts (0.72)
   "Session management utilities"
2. docs/authentication.md (0.68)
   "Authentication Guide"
3. tests/auth.test.ts (0.54)
4. src/middleware/index.ts (0.41)
```

## How It Works

1. **Indexing**: Scans workspace for supported file types, builds TF-IDF vectors using feature hashing
2. **Search**: Vectorizes query (file or text), calculates cosine similarity against indexed documents
3. **Results**: Returns files sorted by similarity score above threshold

The index is stored in `.similar-files/index.json` within the workspace root.

## Use Cases

- **Explore unfamiliar code**: Find related implementations across a codebase
- **Find duplicate docs**: Locate overlapping documentation
- **Narrow search scope**: Query similar files before grepping
- **Understand context**: Discover files that discuss similar concepts

## License

MIT
