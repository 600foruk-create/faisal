import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');
const nextDir = path.join(rootDir, '.next');

const staticTargets = [
  'index.html',
  '404.html',
  '_next',
  'sale',
  'register',
  'returns',
  'hold',
  'closing',
  'reports',
  'settings',
];

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

  for (const name of staticTargets) {
    const src = path.join(outDir, name);
    const dest = path.join(rootDir, name);
    if (!fs.existsSync(src)) continue;
    rmSafe(dest);
    fs.cpSync(src, dest, { recursive: true });
  }

  console.log('Static export copied to repository root for Hostinger deployment.');
} finally {
  rmSafe(outDir);
}
