#!/usr/bin/env node

/**
 * Local Upstream Sync Script
 *
 * Safe workflow for syncing fork with upstream on Windows
 * Handles: Fetch -> Compare -> Merge -> Build verification
 */

import { execSync } from 'child_process';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

function exec(cmd, options = {}) {
  try {
    const result = execSync(cmd, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return result?.trim() || '';
  } catch (error) {
    if (options.ignoreError) return null;
    throw error;
  }
}

function log(msg, type = 'info') {
  const icons = {
    info: '[i]',
    success: '[+]',
    warn: '[!]',
    error: '[x]',
    sync: '[~]'
  };
  console.log(`${icons[type] || ''} ${msg}`);
}

// ML4-Lab protected files - prefer our version on conflict
const PROTECTED_PATTERNS = [
  'tokens.css',
  'NavBar.tsx',
  'NavBar.css',
  'StreamItem.tsx',
  'StreamItem.css',
  'Player/index.tsx',
  'Player.css',
  'ship.js',
  'sync.js',
  'animations.css'
];

function isProtectedFile(filepath) {
  return PROTECTED_PATTERNS.some(pattern => filepath.includes(pattern));
}

async function main() {
  console.log('\n=== ML4-Lab Upstream Sync ===\n');

  // Step 1: Check git status
  log('Checking working directory...');
  const status = exec('git status --porcelain', { silent: true });

  let stashed = false;
  if (status && status.trim() !== '') {
    log('You have uncommitted changes:', 'warn');
    console.log(status);
    const proceed = await question('\nStash changes and continue? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      log('Aborted. Commit or stash your changes first.', 'error');
      rl.close();
      process.exit(1);
    }

    const stashName = `sync-stash-${Date.now()}`;
    exec(`git stash push -m "${stashName}"`, { silent: true });
    stashed = true;
    log('Changes stashed', 'success');
  }

  // Step 2: Ensure upstream remote exists
  log('Checking remotes...');
  const remotes = exec('git remote', { silent: true });

  if (!remotes.includes('origin')) {
    log('Remote "origin" not found. Adding upstream...', 'warn');
    exec('git remote add origin https://github.com/n-ce/ytify.git', { silent: true, ignoreError: true });
  }

  // Step 3: Fetch upstream
  log('Fetching upstream (origin/main)...', 'sync');
  try {
    exec('git fetch origin main', { silent: true });
  } catch {
    log('Failed to fetch upstream. Check your network connection.', 'error');
    rl.close();
    process.exit(1);
  }

  // Step 4: Compare
  log('Analyzing changes...');

  let mergeBase, upstreamHead, localHead;
  try {
    mergeBase = exec('git merge-base origin/main HEAD', { silent: true });
    upstreamHead = exec('git rev-parse origin/main', { silent: true });
    localHead = exec('git rev-parse HEAD', { silent: true });
  } catch {
    log('Failed to analyze git history. Ensure origin/main exists.', 'error');
    rl.close();
    process.exit(1);
  }

  if (upstreamHead === mergeBase) {
    log('Already up to date with upstream!', 'success');
    if (stashed) {
      const popStash = await question('\nRestore stashed changes? (y/N): ');
      if (popStash.toLowerCase() === 'y') {
        exec('git stash pop', { silent: true });
        log('Stashed changes restored', 'success');
      }
    }
    rl.close();
    process.exit(0);
  }

  // Count and show commits
  const commitCount = exec(`git rev-list --count ${mergeBase}..${upstreamHead}`, { silent: true });
  log(`Upstream has ${commitCount} new commit(s)`);

  console.log('\n--- New upstream commits ---');
  exec(`git log --oneline ${mergeBase}..${upstreamHead} --color=always | head -20`);
  console.log('---\n');

  // Step 5: Check for conflicts
  log('Checking for potential conflicts...');

  // Create temp branch for merge test
  const testBranch = `_sync_test_${Date.now()}`;
  exec(`git checkout -b ${testBranch}`, { silent: true });

  let hasConflicts = false;
  let conflictFiles = [];

  try {
    exec('git merge origin/main --no-commit --no-ff', { silent: true });
    exec('git merge --abort', { silent: true, ignoreError: true });
  } catch {
    hasConflicts = true;
    const conflicts = exec('git diff --name-only --diff-filter=U', { silent: true, ignoreError: true });
    conflictFiles = conflicts ? conflicts.split('\n').filter(f => f.trim()) : [];
    exec('git merge --abort', { silent: true, ignoreError: true });
  }

  // Return to original branch
  exec('git checkout -', { silent: true });
  exec(`git branch -D ${testBranch}`, { silent: true, ignoreError: true });

  if (hasConflicts) {
    log('Merge conflicts detected in:', 'warn');
    conflictFiles.forEach(f => console.log(`  - ${f}`));
    console.log('');

    // Check for protected files
    const protectedConflicts = conflictFiles.filter(isProtectedFile);
    if (protectedConflicts.length > 0) {
      log('ML4-Lab protected files affected:', 'warn');
      protectedConflicts.forEach(f => console.log(`  - ${f}`));
      console.log('\n  These files contain ML4-Lab customizations.');
      console.log('  During conflict resolution, prefer ML4-Lab versions.\n');
    }
  } else {
    log('No conflicts detected - clean merge possible', 'success');
  }

  // Step 6: Confirm merge
  const mergePrompt = hasConflicts
    ? 'Proceed with merge (will need manual conflict resolution)? (y/N): '
    : 'Proceed with merge? (y/N): ';

  const mergeOption = await question(mergePrompt);
  if (mergeOption.toLowerCase() !== 'y') {
    log('Aborted.', 'warn');
    if (stashed) {
      exec('git stash pop', { silent: true, ignoreError: true });
      log('Stashed changes restored', 'success');
    }
    rl.close();
    process.exit(0);
  }

  // Step 7: Perform merge
  log('Merging upstream changes...', 'sync');

  try {
    exec('git merge origin/main --no-ff -m "chore(sync): merge upstream changes"');
    log('Merge successful!', 'success');
  } catch {
    log('Merge has conflicts. Please resolve manually:', 'warn');
    console.log('\n  1. Edit conflicting files (look for <<<<<<< markers)');
    console.log('  2. For ML4-Lab protected files, keep our version');
    console.log('  3. git add <resolved-files>');
    console.log('  4. git commit');
    console.log('\n  To abort: git merge --abort\n');
    rl.close();
    process.exit(1);
  }

  // Step 8: Build check
  log('Running build verification...');
  try {
    exec('npm run build');
    log('Build successful!', 'success');
  } catch {
    log('Build failed after merge. Check TypeScript errors.', 'error');
    console.log('\n  To undo the merge: git reset --hard HEAD~1');
    console.log('  To keep merge and fix: npm run dev, then fix errors\n');
    rl.close();
    process.exit(1);
  }

  // Step 9: Pop stash if needed
  if (stashed) {
    const popStash = await question('\nRestore stashed changes? (y/N): ');
    if (popStash.toLowerCase() === 'y') {
      try {
        exec('git stash pop', { silent: true });
        log('Stashed changes restored', 'success');
      } catch {
        log('Stash pop failed (possible conflicts). Use: git stash show', 'warn');
      }
    }
  }

  // Done
  console.log('');
  log('Sync complete!', 'success');
  console.log('\nNext steps:');
  console.log('  1. Test the application: npm run dev');
  console.log('  2. Ship when ready: npm run ship\n');

  rl.close();
}

main().catch(error => {
  console.error('\nError:', error.message);
  rl.close();
  process.exit(1);
});
