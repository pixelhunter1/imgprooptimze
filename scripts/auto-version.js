#!/usr/bin/env node

/**
 * Automatic version incrementer
 * Increments package.json version before each build
 */

import fs from 'fs';
import path from 'path';

// Get version type from command line args (patch, minor, major)
const versionType = process.argv[2] || 'patch';

// Validate version type
if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: patch, minor, or major');
  process.exit(1);
}

// Read package.json
const packageJsonPath = './package.json';
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Parse current version
const currentVersion = packageJson.version || '1.0.0';
const versionParts = currentVersion.split('.').map(Number);

if (versionParts.length !== 3) {
  console.error('❌ Invalid version format in package.json');
  process.exit(1);
}

let [major, minor, patch] = versionParts;

// Increment version based on type
switch (versionType) {
  case 'major':
    major += 1;
    minor = 0;
    patch = 0;
    break;
  case 'minor':
    minor += 1;
    patch = 0;
    break;
  case 'patch':
  default:
    patch += 1;
    break;
}

const newVersion = `${major}.${minor}.${patch}`;

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Version incremented: ${currentVersion} → ${newVersion} (${versionType})`);
