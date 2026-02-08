#!/usr/bin/env node

/**
 * Ship Script - Unified Deployment Automation
 * Handles: Build → Version → Tag → Push
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

function exec(cmd, silent = false) {
  try {
    const result = execSync(cmd, { encoding: 'utf-8' });
    if (!silent) console.log(result);
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${cmd}`);
    console.error(error.message);
    process.exit(1);
  }
}

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  return pkg.version;
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number);
  
  switch(type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: throw new Error('Invalid version type');
  }
}

function updatePackageVersion(newVersion) {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  pkg.version = newVersion;
  writeFileSync('./package.json', JSON.stringify(pkg, null, 2) + '\n');
}

async function main() {
  console.log('\n🚀 Ship Script - music.ml4-lab.com\n');
  
  // Step 1: Check git status
  console.log('📋 Checking git status...');
  const status = exec('git status --porcelain', true);
  if (status.trim() !== '') {
    console.log('⚠️  You have uncommitted changes:');
    console.log(status);
    const proceed = await question('\nDo you want to continue anyway? (y/N): ');
    if (proceed.toLowerCase() !== 'y') {
      console.log('❌ Aborted.');
      process.exit(0);
    }
  }
  
  // Step 2: Run build
  console.log('\n🔨 Running build check...');
  exec('npm run build');
  
  // Step 3: Version bump
  const current = getCurrentVersion();
  console.log(`\n📦 Current version: ${current}`);
  console.log('\nVersion bump type:');
  console.log('  1) Patch (8.2.1 → 8.2.2) - Bug fixes');
  console.log('  2) Minor (8.2.1 → 8.3.0) - New features');
  console.log('  3) Major (8.2.1 → 9.0.0) - Breaking changes');
  
  const choice = await question('\nSelect [1/2/3]: ');
  const typeMap = { '1': 'patch', '2': 'minor', '3': 'major' };
  const bumpType = typeMap[choice];
  
  if (!bumpType) {
    console.log('❌ Invalid choice.');
    process.exit(1);
  }
  
  const newVersion = bumpVersion(current, bumpType);
  console.log(`\n✨ New version: ${newVersion}`);
  
  const confirm = await question('\nProceed with deployment? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ Aborted.');
    process.exit(0);
  }
  
  // Step 4: Update package.json
  console.log('\n📝 Updating package.json...');
  updatePackageVersion(newVersion);
  
  // Step 5: Git commit and tag
  console.log('\n🏷️  Creating git commit and tag...');
  exec('git add package.json');
  exec(`git commit -m "chore: bump version to ${newVersion}"`);
  exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
  
  // Step 6: Push
  console.log('\n⬆️  Pushing to remote...');
  exec('git push');
  exec('git push --tags');
  
  console.log(`\n✅ Successfully shipped v${newVersion}!`);
  console.log('\n🎉 Deployment complete. Your changes are live at https://music.ml4-lab.com/\n');
  
  rl.close();
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  rl.close();
  process.exit(1);
});
