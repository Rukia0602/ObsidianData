import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(rootDir, 'backend');
const venvDir = path.join(backendDir, '.venv');
const isWin = process.platform === 'win32';
const python = path.join(venvDir, isWin ? 'Scripts/python.exe' : 'bin/python');
const extraArgs = process.argv.slice(2);

if (!fs.existsSync(python)) {
  console.error('Backend venv not found. Run: bun run setup:backend');
  process.exit(1);
}

const port = process.env.PORT || '8000';
const args = ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', port, ...extraArgs];

const child = spawn(python, args, {
  cwd: backendDir,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 0));