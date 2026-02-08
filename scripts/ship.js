#!/usr/bin/env node

/**
 * Ship Script - ML4-Lab Intelligent Versioning
 *
 * Version Format: UPSTREAM_VERSION-ml4.PATCH
 * Example: 8.2.1-ml4.3
 *
 * Handles: Build -> Version -> Tag -> Push
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function exec(cmd, options = {}) {
  try {
    const result = execSync(cmd, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit'
    });
    return result?.trim() || '';
  } catch (error) {
    if (options.ignoreError) return null;
    if (!options.silent) {
      console.error(`Command failed: ${cmd}`);
      console.error(error.message);
    }
    if (!options.ignoreError) process.exit(1);
    return null;
  }
}

function log(msg, type = 'info') {
  const icons = {
    info: '[i]',
    success: '[+]',
    warn: '[!]',
    error: '[x]',
    rocket: '[>]'
  };
  console.log(`${icons[type] || ''} ${msg}`);
}

/**
 * Parse version string
 * Supports: 8.2.1 or 8.2.1-ml4.3
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-ml4\.(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }

  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    ml4Patch: match[4] !== undefined ? parseInt(match[4]) : null,
    upstream: `${match[1]}.${match[2]}.${match[3]}`,
    full: version,
    isML4: match[4] !== undefined
  };
}

/**
 * Format version with ML4-Lab suffix
 */
function formatVersion(upstream, ml4Patch = 0) {
  return `${upstream}-ml4.${ml4Patch}`;
}

/**
 * Get upstream version from origin/main
 */
function getUpstreamVersion() {
  try {
    exec('git fetch origin main', { silent: true, ignoreError: true });
    const upstreamPkg = exec('git show origin/main:package.json', { silent: true, ignoreError: true });
    if (upstreamPkg) {
      const pkg = JSON.parse(upstreamPkg);
      return pkg.version;
    }
  } catch {
    // Upstream not available
  }
  return null;
}

/**
 * Get current version from package.json
 */
function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  return pkg.version;
}

/**
 * Update version in package.json
 */
function updatePackageVersion(newVersion) {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  pkg.version = newVersion;
  writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
}

/**
 * Bump version based on type
 */
function bumpVersion(current, type) {
  const parsed = parseVersion(current);

  switch (type) {
    case 'ml4-patch':
      // Increment ML4 patch: 8.2.1-ml4.0 -> 8.2.1-ml4.1
      const newMl4Patch = (parsed.ml4Patch ?? -1) + 1;
      return formatVersion(parsed.upstream, newMl4Patch);

    case 'patch':
      // Upstream patch bump: 8.2.1 -> 8.2.2-ml4.0
      return formatVersion(`${parsed.major}.${parsed.minor}.${parsed.patch + 1}`, 0);

    case 'minor':
      // Upstream minor bump: 8.2.1 -> 8.3.0-ml4.0
      return formatVersion(`${parsed.major}.${parsed.minor + 1}.0`, 0);

    case 'major':
      // Upstream major bump: 8.2.1 -> 9.0.0-ml4.0
      return formatVersion(`${parsed.major + 1}.0.0`, 0);

    default:
      throw new Error(`Invalid bump type: ${type}`);
  }
}

async function main() {
  console.log('\n=== ML4-Lab Ship Script ===\n');
  console.log('music.ml4-lab.com\n');

  // Step 1: Check git status
  log('Checking git status...');
  const status = exec('git status --porcelain', { silent: true });

  if (status && status.trim() !== '') {
    log('You have uncommitted changes:', 'warn');
    console.log(status);
    const proceed = await question('\nContinue anyway? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      log('Aborted. Commit your changes first.', 'error');
      process.exit(0);
    }
  }

  // Step 2: Gather version info
  const currentVersion = getCurrentVersion();
  const current = parseVersion(currentVersion);
  const upstreamVersion = getUpstreamVersion();

  console.log('');
  log(`Current version: ${currentVersion}`);
  log(`Upstream version: ${upstreamVersion || 'unknown'}`);
  console.log('');

  // Step 3: Build options
  console.log('Version bump options:\n');

  const options = [];

  // Option 1: ML4 Patch (always available)
  const ml4PatchVersion = bumpVersion(currentVersion, 'ml4-patch');
  options.push({
    key: '1',
    label: `ML4 Patch: ${ml4PatchVersion}`,
    version: ml4PatchVersion,
    description: 'Bug fixes, small tweaks to ML4-Lab features'
  });

  // Option 2: Sync with upstream (if newer version available)
  if (upstreamVersion && upstreamVersion !== current.upstream) {
    const syncVersion = formatVersion(upstreamVersion, 0);
    options.push({
      key: '2',
      label: `Sync with upstream: ${syncVersion}`,
      version: syncVersion,
      description: `Merge upstream changes (v${upstreamVersion}), reset ML4 patch counter`
    });
  }

  // Option 3: Upstream-style patch
  const patchVersion = bumpVersion(currentVersion, 'patch');
  options.push({
    key: '3',
    label: `Patch: ${patchVersion}`,
    version: patchVersion,
    description: 'Increment upstream patch version'
  });

  // Option 4: Minor
  const minorVersion = bumpVersion(currentVersion, 'minor');
  options.push({
    key: '4',
    label: `Minor: ${minorVersion}`,
    version: minorVersion,
    description: 'New features, reset patch'
  });

  // Option 5: Major
  const majorVersion = bumpVersion(currentVersion, 'major');
  options.push({
    key: '5',
    label: `Major: ${majorVersion}`,
    version: majorVersion,
    description: 'Breaking changes'
  });

  // Option C: Custom
  options.push({
    key: 'c',
    label: 'Custom version',
    description: 'Enter version manually'
  });

  // Display options
  options.forEach(opt => {
    console.log(`  ${opt.key}) ${opt.label}`);
    console.log(`     ${opt.description}\n`);
  });

  const choice = await question('Select option: ');

  let newVersion;
  if (choice.toLowerCase() === 'c') {
    newVersion = await question('Enter version (e.g., 8.2.2-ml4.0): ');
    // Validate
    try {
      parseVersion(newVersion);
    } catch {
      log('Invalid version format. Use: X.Y.Z or X.Y.Z-ml4.N', 'error');
      process.exit(1);
    }
  } else {
    const selected = options.find(o => o.key === choice);
    if (!selected || !selected.version) {
      log('Invalid option.', 'error');
      process.exit(1);
    }
    newVersion = selected.version;
  }

  console.log('');
  log(`New version: ${newVersion}`, 'rocket');

  // Step 4: Run build
  console.log('');
  log('Running build check...');
  exec('npm run build');
  log('Build successful!', 'success');

  // Step 5: Confirm
  const confirm = await question('\nProceed with deployment? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    log('Aborted.', 'warn');
    process.exit(0);
  }

  // Step 6: Update package.json
  console.log('');
  log('Updating package.json...');
  updatePackageVersion(newVersion);

  // Step 7: Git commit and tag
  log('Creating git commit and tag...');
  exec('git add package.json');
  exec(`git commit -m "chore: release v${newVersion}"`);
  exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);

  // Step 8: Push
  log('Pushing to remote...');
  exec('git push');
  exec('git push --tags');

  console.log('');
  log(`Successfully shipped v${newVersion}!`, 'success');
  console.log('');
  log('Deployment: https://music.ml4-lab.com/', 'rocket');
  console.log('');

  rl.close();
}

main().catch(error => {
  console.error('\nError:', error.message);
  rl.close();
  process.exit(1);
});
