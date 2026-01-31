/**
 * Shared utilities and configuration for similar-files.
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

// Default configuration
export const DEFAULT_CONFIG = {
  hashDim: 2048,
  contentExcerptLength: 1000,
  threshold: 0.1,
  top: 10,
  allowedExtensions: ['.md', '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go'],
  excludedDirs: [
    'node_modules',
    'venv',
    '.venv',
    'target',
    '.git',
    'dist',
    'build',
    '__pycache__',
    '.pnpm-store',
    '.netlify',
    'archives',
    '.next',
    '.cache',
    'coverage'
  ]
};

/**
 * Get the default index directory for a workspace.
 * @param {string} workspaceRoot - The workspace root path.
 * @returns {string} The index directory path.
 */
export function getDefaultIndexDir(workspaceRoot) {
  // Store index in a .similar-files directory within the workspace
  return join(workspaceRoot, '.similar-files');
}

/**
 * Get the index file path.
 * @param {string} indexDir - The index directory.
 * @returns {string} The index file path.
 */
export function getIndexFile(indexDir) {
  return join(indexDir, 'index.json');
}

/**
 * Expand sparse vector to dense array.
 * @param {Object} sparse - Sparse vector object with index keys.
 * @param {number} dim - Target dimension.
 * @returns {number[]} Dense vector array.
 */
export function expandSparseVector(sparse, dim) {
  const dense = new Array(dim).fill(0);
  for (const [idx, val] of Object.entries(sparse)) {
    dense[parseInt(idx)] = val;
  }
  return dense;
}

/**
 * Parse common CLI arguments.
 * @param {string[]} args - Command line arguments.
 * @param {Object} defaults - Default values.
 * @returns {Object} Parsed arguments.
 */
export function parseBaseArgs(args, defaults = {}) {
  const result = { ...defaults };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--root' || arg === '-r') {
      result.root = args[++i];
    } else if (arg === '--index' || arg === '-i') {
      result.indexDir = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    }
  }

  return result;
}
