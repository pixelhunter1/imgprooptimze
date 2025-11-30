#!/usr/bin/env node

/**
 * Build script to inject version information and generate version.json
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get version info
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version || '1.0.0';
const buildTimestamp = Date.now().toString();

// Get git hash if available
let buildHash = 'dev';
try {
  buildHash = execSync('git rev-parse HEAD').toString().trim();
} catch {
  // Fallback to timestamp-based hash if git is not available
  buildHash = buildTimestamp.slice(-8);
}

console.log(`Building version ${version} with hash ${buildHash.slice(0, 8)}`);

// Create version.json for the public directory
const versionInfo = {
  version,
  buildTimestamp,
  buildHash,
  buildDate: new Date().toISOString()
};

// Write version.json to public directory
fs.writeFileSync('./public/version.json', JSON.stringify(versionInfo, null, 2));
console.log('✅ Generated public/version.json');

// Create version.json for dist directory (will be copied during build)
const distVersionPath = './dist/version.json';
if (fs.existsSync('./dist')) {
  fs.writeFileSync(distVersionPath, JSON.stringify(versionInfo, null, 2));
  console.log('✅ Generated dist/version.json');
}

console.log(`🚀 Build version setup complete: v${version} (${buildHash.slice(0, 8)})`);
