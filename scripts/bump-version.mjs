#!/usr/bin/env node

/**
 * Version bump script for Tabula
 * Usage: node scripts/bump-version.mjs <new-version>
 * Example: node scripts/bump-version.mjs 0.2.0
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node scripts/bump-version.mjs <new-version>');
  console.error('Example: node scripts/bump-version.mjs 0.2.0');
  process.exit(1);
}

// Validate version format
if (!/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
  console.error(`Invalid version format: ${newVersion}`);
  console.error('Expected format: x.y.z or x.y.z-beta.1');
  process.exit(1);
}

const files = [
  {
    path: 'desktop/package.json',
    update: (content) => {
      const json = JSON.parse(content);
      json.version = newVersion;
      return JSON.stringify(json, null, 2) + '\n';
    }
  },
  {
    path: 'desktop/src-tauri/tauri.conf.json',
    update: (content) => {
      const json = JSON.parse(content);
      json.version = newVersion;
      return JSON.stringify(json, null, 2) + '\n';
    }
  },
  {
    path: 'desktop/src-tauri/Cargo.toml',
    update: (content) => {
      return content.replace(/^version = ".*"$/m, `version = "${newVersion}"`);
    }
  },
  {
    path: 'extension/package.json',
    update: (content) => {
      const json = JSON.parse(content);
      json.version = newVersion;
      return JSON.stringify(json, null, 2) + '\n';
    }
  },
  {
    path: 'extension/manifest.json',
    update: (content) => {
      const json = JSON.parse(content);
      json.version = newVersion;
      return JSON.stringify(json, null, 2) + '\n';
    }
  }
];

console.log(`\n📦 Bumping version to ${newVersion}\n`);

for (const file of files) {
  const fullPath = join(rootDir, file.path);
  try {
    const content = readFileSync(fullPath, 'utf-8');
    const updated = file.update(content);
    writeFileSync(fullPath, updated);
    console.log(`  ✓ ${file.path}`);
  } catch (error) {
    console.error(`  ✗ ${file.path}: ${error.message}`);
    process.exit(1);
  }
}

console.log(`
✅ Version updated to ${newVersion}

Next steps:
  1. Review changes: git diff
  2. Commit: git commit -am "chore: bump version to ${newVersion}"
  3. Tag: git tag v${newVersion}
  4. Push: git push && git push --tags
`);
