import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(rootDir, 'backend');
const venvDir = path.join(backendDir, '.venv');
const isWin = process.platform === 'win32';
const pythonCmd = isWin ? 'python' : 'python3';
const minPython = [3, 10];

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCapture(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    shell: isWin,
  });
  return result;
}

function parsePythonVersion(output) {
  const match = output.match(/Python (\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

function isPythonVersionOk(version) {
  if (!version) return false;
  const [major, minor] = version;
  if (major !== minPython[0]) return major > minPython[0];
  return minor >= minPython[1];
}

const versionCheck = runCapture(pythonCmd, ['--version']);
if (versionCheck.status !== 0) {
  console.error(`[setup] Python not found. Install Python >= ${minPython.join('.')} and ensure "${pythonCmd}" is on PATH.`);
  process.exit(1);
}

const pythonVersion = parsePythonVersion(versionCheck.stdout || versionCheck.stderr || '');
if (!isPythonVersionOk(pythonVersion)) {
  const found = pythonVersion ? pythonVersion.join('.') : 'unknown';
  console.error(`[setup] Python ${found} detected. Python >= ${minPython.join('.')} is required.`);
  process.exit(1);
}

const forceVenv = process.env.FORCE_VENV === '1';
if (forceVenv && fs.existsSync(venvDir)) {
  console.log('[setup] FORCE_VENV=1 — removing existing virtual environment...');
  fs.rmSync(venvDir, { recursive: true, force: true });
}

if (!fs.existsSync(venvDir)) {
  console.log('[setup] Creating Python virtual environment...');
  run(pythonCmd, ['-m', 'venv', '.venv'], backendDir);
}

const python = path.join(venvDir, isWin ? 'Scripts/python.exe' : 'bin/python');

const PIP_INDEX_ATTEMPTS = process.env.PIP_INDEX_URL
  ? [process.env.PIP_INDEX_URL]
  : [
      null,
      'https://pypi.tuna.tsinghua.edu.cn/simple',
      'https://mirrors.aliyun.com/pypi/simple',
    ];

function pipInstallArgs(extraArgs) {
  return [
    '--default-timeout=300',
    '--retries=10',
    ...extraArgs,
  ];
}

function pipInstallWithMirrors(label, baseArgs) {
  for (let i = 0; i < PIP_INDEX_ATTEMPTS.length; i += 1) {
    const mirror = PIP_INDEX_ATTEMPTS[i];
    const args = pipInstallArgs(baseArgs);
    if (mirror) {
      console.log(`[setup] ${label} (index: ${mirror})...`);
      args.push('-i', mirror, '--trusted-host', new URL(mirror).hostname);
    } else {
      console.log(`[setup] ${label} (PyPI default)...`);
    }

    const result = spawnSync(python, ['-m', 'pip', 'install', ...args], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: isWin,
    });
    if (result.status === 0) return true;

    if (i < PIP_INDEX_ATTEMPTS.length - 1) {
      console.warn('[setup] pip install failed — retrying with another index...');
    }
  }
  return false;
}

if (!pipInstallWithMirrors('Upgrading pip', ['--upgrade', 'pip', 'setuptools', 'wheel'])) {
  console.error('[setup] pip upgrade failed. Check your network or set PIP_INDEX_URL.');
  process.exit(1);
}

if (!pipInstallWithMirrors('Installing Python dependencies', ['-r', 'requirements.txt'])) {
  console.error('[setup] pip install failed. Try:');
  console.error('  1. Delete backend/.venv');
  console.error('  2. Run: FORCE_VENV=1 bun run setup:backend');
  console.error('     (Windows PowerShell: $env:FORCE_VENV=1; bun run setup:backend)');
  console.error('  3. Or set a mirror: $env:PIP_INDEX_URL="https://pypi.tuna.tsinghua.edu.cn/simple"');
  process.exit(1);
}

console.log('[setup] Backend ready.');