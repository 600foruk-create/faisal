import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');
const nextDir = path.join(rootDir, '.next');

const PROTECTED_ROOT_NAMES = new Set([
  'api',
  'src',
  'tests',
  'scripts',
  'node_modules',
  '.git',
  '.next',
  '.htaccess',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.ts',
  'postcss.config.mjs',
  'README.md',
  'next-env.d.ts',
  'data',
  'out',
]);

function rmSafe(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

rmSafe(outDir);
rmSafe(nextDir);

try {
  execSync('npx.cmd next build --webpack', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, STATIC_EXPORT: '1' },
  });

  // Remove previous exported __next.* or *.txt/*.html files in root before copying fresh out/
  for (const existing of fs.readdirSync(rootDir)) {
    if (PROTECTED_ROOT_NAMES.has(existing)) continue;
    if (
      existing.startsWith('__next') ||
      existing.endsWith('.html') ||
      existing.endsWith('.txt') ||
      existing === '_next' ||
      existing === '_not-found'
    ) {
      rmSafe(path.join(rootDir, existing));
    }
  }

  for (const name of fs.readdirSync(outDir)) {
    if (PROTECTED_ROOT_NAMES.has(name)) continue;
    const src = path.join(outDir, name);
    const dest = path.join(rootDir, name);
    rmSafe(dest);
    fs.cpSync(src, dest, { recursive: true });
  }

  console.log('Full static export (including RSC .txt & __next.* payloads) copied to root.');
} finally {
  rmSafe(outDir);
}
