#!/usr/bin/env node

/**
 * Find similar files using the pre-built index.
 *
 * Usage:
 *   similar-find path/to/file.md             # Find files similar to a file
 *   similar-find --text "query text"         # Find files similar to text
 *   similar-find --top 5 path/to/file.md     # Limit results
 *   similar-find --threshold 0.2 ...         # Set minimum similarity
 */

import { readFile } from 'node:fs/promises';
import { join, relative, isAbsolute, resolve } from 'node:path';
import {
  vectorizeDocuments,
  cosineSimilarity,
  stripFrontmatter
} from '@watthem/quarrel';
import {
  DEFAULT_CONFIG,
  getDefaultIndexDir,
  getIndexFile,
  expandSparseVector
} from './shared.mjs';

function printHelp() {
  console.log(`
similar-find - Find related files using TF-IDF similarity

Usage:
  similar-find <file-path>        Find files similar to a file
  similar-find --text "query"     Find files similar to text

Options:
  --text, -t <text>     Search using text instead of a file
  --top, -n <count>     Number of results (default: ${DEFAULT_CONFIG.top})
  --threshold <value>   Minimum similarity score (default: ${DEFAULT_CONFIG.threshold})
  --index, -i <path>    Custom index directory
  --json                Output as JSON
  --help, -h            Show this help

Examples:
  similar-find README.md
  similar-find --text "authentication middleware"
  similar-find --top 5 --threshold 0.2 docs/architecture.md
  similar-find -i ~/.similar-files/myproject src/main.ts
`);
}

/**
 * Parse command line arguments.
 */
function parseArgs(args) {
  const result = {
    query: null,
    isText: false,
    top: DEFAULT_CONFIG.top,
    threshold: DEFAULT_CONFIG.threshold,
    indexDir: null,
    json: false,
    help: false
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--text' || arg === '-t') {
      result.isText = true;
      result.query = args[++i];
    } else if (arg === '--top' || arg === '-n') {
      result.top = parseInt(args[++i], 10);
    } else if (arg === '--threshold') {
      result.threshold = parseFloat(args[++i]);
    } else if (arg === '--index' || arg === '-i') {
      result.indexDir = args[++i];
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (!arg.startsWith('-')) {
      result.query = arg;
    }

    i++;
  }

  return result;
}

/**
 * Load and validate the index.
 */
async function loadIndex(indexDir) {
  // If no index dir specified, try current directory
  const dir = indexDir || getDefaultIndexDir(process.cwd());
  const indexFile = getIndexFile(dir);

  try {
    const data = await readFile(indexFile, 'utf-8');
    const index = JSON.parse(data);

    if (!index.version || !index.vectors || !index.metadata) {
      throw new Error('Invalid index format');
    }

    return { index, indexFile };
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`Index not found at: ${indexFile}`);
      console.error('');
      console.error('To create an index, run:');
      console.error('  similar-index --root /path/to/workspace');
      process.exit(1);
    }
    throw err;
  }
}

/**
 * Get query content from file or text.
 */
async function getQueryContent(query, isText, workspaceRoot) {
  if (isText) {
    return { content: query, title: 'Query' };
  }

  // Resolve file path
  let filePath = query;
  if (!isAbsolute(filePath)) {
    // Try relative to current directory first
    filePath = resolve(process.cwd(), filePath);
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const relativePath = workspaceRoot
      ? relative(workspaceRoot, filePath)
      : query;

    return {
      content: stripFrontmatter(content),
      title: relativePath,
      absolutePath: filePath
    };
  } catch (err) {
    console.error(`Cannot read file: ${query}`);
    console.error(err.message);
    process.exit(1);
  }
}

/**
 * Find similar files to query content.
 */
async function findSimilar(options) {
  const { index, indexFile } = await loadIndex(options.indexDir);
  const workspaceRoot = index.root || null;

  const { content, title, absolutePath } = await getQueryContent(
    options.query,
    options.isText,
    workspaceRoot
  );

  // Vectorize query with same settings as index
  const { vectors: [queryVector] } = vectorizeDocuments(
    [{ id: 'query', title, content }],
    { contentExcerptLength: DEFAULT_CONFIG.contentExcerptLength, useHashing: true, hashDim: index.hashDim }
  );

  // Calculate similarities
  const results = [];
  for (let i = 0; i < index.vectors.length; i++) {
    const docVector = expandSparseVector(index.vectors[i], index.hashDim);
    const similarity = cosineSimilarity(queryVector, docVector);

    // Skip self-match for file queries
    if (!options.isText) {
      const docAbsPath = workspaceRoot
        ? resolve(workspaceRoot, index.metadata[i].path)
        : index.metadata[i].path;

      if (absolutePath && docAbsPath === absolutePath) {
        continue;
      }
      if (index.metadata[i].path === title) {
        continue;
      }
    }

    if (similarity >= options.threshold) {
      results.push({
        path: index.metadata[i].path,
        title: index.metadata[i].title,
        similarity: Math.round(similarity * 100) / 100,
        ext: index.metadata[i].ext
      });
    }
  }

  // Sort by similarity
  results.sort((a, b) => b.similarity - a.similarity);

  // Return top N
  return {
    results: results.slice(0, options.top),
    query: options.isText ? options.query : title,
    workspaceRoot
  };
}

/**
 * Format and print results.
 */
function printResults(data, options) {
  const { results, query, workspaceRoot } = data;

  if (options.json) {
    console.log(JSON.stringify({ query, workspaceRoot, results }, null, 2));
    return;
  }

  if (results.length === 0) {
    console.log('No similar files found above threshold.');
    console.log(`Try lowering --threshold (current: ${options.threshold})`);
    return;
  }

  console.log(`Similar files to: ${query}`);
  if (workspaceRoot) {
    console.log(`Workspace: ${workspaceRoot}`);
  }
  console.log('');

  results.forEach((r, i) => {
    const score = r.similarity.toFixed(2);
    console.log(`${i + 1}. ${r.path} (${score})`);
    const filenameWithoutExt = r.path.split('/').pop().replace(/\.[^.]+$/, '');
    if (r.title !== filenameWithoutExt) {
      console.log(`   "${r.title}"`);
    }
  });
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(1);
  }

  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.query) {
    console.error('Error: No query file or text provided');
    printHelp();
    process.exit(1);
  }

  const data = await findSimilar(options);
  printResults(data, options);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
