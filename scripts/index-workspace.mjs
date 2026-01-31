#!/usr/bin/env node

/**
 * Index workspace files for similarity search.
 * Scans files and builds TF-IDF vectors.
 *
 * Usage:
 *   similar-index --root /path/to/workspace
 *   similar-index                           # Uses current directory
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, extname, basename, resolve } from 'node:path';
import {
  vectorizeDocuments,
  fingerprintText
} from '@watthem/quarrel';
import {
  DEFAULT_CONFIG,
  getDefaultIndexDir,
  getIndexFile,
  parseBaseArgs
} from './shared.mjs';

/**
 * Parse YAML frontmatter from markdown content.
 * Returns { frontmatter: object|null, body: string }
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: null, body: content };
  }

  const yamlBlock = match[1];
  const body = match[2];

  // Simple YAML parser for common frontmatter fields
  const frontmatter = {};
  const lines = yamlBlock.split('\n');
  let currentKey = null;
  let inArray = false;

  for (const line of lines) {
    // Array item (indented with -)
    if (inArray && /^\s+-\s*["']?(.+?)["']?\s*$/.test(line)) {
      const value = line.match(/^\s+-\s*["']?(.+?)["']?\s*$/)[1];
      if (!frontmatter[currentKey]) frontmatter[currentKey] = [];
      frontmatter[currentKey].push(value);
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w+):\s*["']?(.*)["']?\s*$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const value = kvMatch[2].replace(/^["']|["']$/g, '').trim();
      if (value) {
        frontmatter[currentKey] = value;
        inArray = false;
      } else {
        // Empty value might mean upcoming array
        inArray = true;
      }
    }
  }

  return { frontmatter, body };
}

/**
 * Build enriched content for vectorization.
 * Includes frontmatter metadata (title, description, tags) for better similarity matching.
 */
function buildEnrichedContent(content, filename) {
  const { frontmatter, body } = parseFrontmatter(content);

  const parts = [];

  // Include frontmatter fields that aid similarity
  if (frontmatter) {
    if (frontmatter.title) parts.push(frontmatter.title);
    if (frontmatter.description) parts.push(frontmatter.description);
    if (Array.isArray(frontmatter.tags)) {
      parts.push(frontmatter.tags.join(' '));
    }
  }

  // Include meaningful filename (skip pure numeric IDs like 202601310041)
  const baseName = basename(filename, extname(filename));
  if (!/^\d+$/.test(baseName)) {
    // Convert kebab-case/snake_case to words
    const nameWords = baseName.replace(/[-_]/g, ' ');
    parts.push(nameWords);
  }

  // Add the body content
  parts.push(body);

  return {
    enrichedContent: parts.join('\n'),
    frontmatter,
    body
  };
}

function printHelp() {
  console.log(`
similar-index - Build TF-IDF index for workspace files

Usage:
  similar-index [options]

Options:
  --root, -r <path>    Workspace root directory (default: current directory)
  --index, -i <path>   Custom index directory (default: <root>/.similar-files)
  --help, -h           Show this help
  --version, -v        Show version

Examples:
  similar-index                               # Index current directory
  similar-index --root /path/to/project       # Index specific directory
  similar-index -r . -i ~/.similar-files/myproject  # Custom index location

File Types Indexed:
  ${DEFAULT_CONFIG.allowedExtensions.join(', ')}

Excluded Directories:
  ${DEFAULT_CONFIG.excludedDirs.slice(0, 5).join(', ')}, ...
`);
}

/**
 * Recursively collect files from a directory.
 */
async function collectFiles(dir, options, files = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    // Skip directories we can't read
    return files;
  }

  const excludedSet = new Set(options.excludedDirs || DEFAULT_CONFIG.excludedDirs);
  const allowedSet = new Set(options.allowedExtensions || DEFAULT_CONFIG.allowedExtensions);

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!excludedSet.has(entry.name) && !entry.name.startsWith('.')) {
        await collectFiles(fullPath, options, files);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (allowedSet.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Extract a title from file content and frontmatter.
 */
function extractTitle(content, filename, frontmatter) {
  // Prefer frontmatter title
  if (frontmatter?.title) {
    return frontmatter.title;
  }

  // Try to find markdown heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // Try to find Python/Rust doc comment
  const docMatch = content.match(/^(?:"""|\/\/!|\/\*\*)\s*(.+?)(?:"""|$)/m);
  if (docMatch) {
    return docMatch[1].trim();
  }

  // Fall back to filename
  return basename(filename, extname(filename));
}

/**
 * Build the workspace index.
 */
async function buildIndex(options) {
  const root = resolve(options.root || process.cwd());
  const indexDir = options.indexDir || getDefaultIndexDir(root);
  const indexFile = getIndexFile(indexDir);

  console.log('Scanning workspace:', root);
  console.log('Index location:', indexDir);
  console.log('');

  // Collect all files
  const files = await collectFiles(root, options);
  console.log(`Found ${files.length} files to index`);

  if (files.length === 0) {
    console.log('No indexable files found. Check file extensions and excluded directories.');
    process.exit(0);
  }

  // Read file contents and build documents
  const docs = [];
  const metadata = [];

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const relativePath = relative(root, filePath);
      const { enrichedContent, frontmatter, body } = buildEnrichedContent(content, filePath);
      const title = extractTitle(body, filePath, frontmatter);
      const fingerprint = fingerprintText(content);

      docs.push({
        id: relativePath,
        title,
        content: enrichedContent
      });

      metadata.push({
        id: relativePath,
        path: relativePath,
        title,
        fingerprint,
        ext: extname(filePath).toLowerCase(),
        tags: frontmatter?.tags || []
      });
    } catch (err) {
      console.warn(`Skipping ${filePath}: ${err.message}`);
    }
  }

  console.log(`Processing ${docs.length} documents...`);

  // Build TF-IDF vectors with feature hashing
  const { vectors } = vectorizeDocuments(docs, {
    contentExcerptLength: DEFAULT_CONFIG.contentExcerptLength,
    useHashing: true,
    hashDim: DEFAULT_CONFIG.hashDim
  });

  // Create sparse representation to reduce index size
  const sparseVectors = vectors.map(vec => {
    const sparse = {};
    for (let i = 0; i < vec.length; i++) {
      if (vec[i] !== 0) {
        sparse[i] = Math.round(vec[i] * 10000) / 10000; // 4 decimal places
      }
    }
    return sparse;
  });

  // Ensure index directory exists
  await mkdir(indexDir, { recursive: true });

  // Write index
  const index = {
    version: 3,  // v3: includes frontmatter metadata in vectorization
    created: new Date().toISOString(),
    root,
    hashDim: DEFAULT_CONFIG.hashDim,
    docCount: docs.length,
    metadata,
    vectors: sparseVectors
  };

  await writeFile(indexFile, JSON.stringify(index, null, 2));

  console.log('');
  console.log(`Index written to: ${indexFile}`);
  console.log(`Total documents: ${docs.length}`);

  // Summary by file type
  const byExt = {};
  for (const m of metadata) {
    byExt[m.ext] = (byExt[m.ext] || 0) + 1;
  }
  console.log('');
  console.log('Files by type:');
  for (const [ext, count] of Object.entries(byExt).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ext}: ${count}`);
  }
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const options = parseBaseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (options.version) {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json');
    console.log(`similar-index v${pkg.version}`);
    process.exit(0);
  }

  await buildIndex(options);
}

main().catch(err => {
  console.error('Index build failed:', err.message);
  process.exit(1);
});
