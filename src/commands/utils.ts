import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getNgxModulePath } from '../services/config';
import { NGX_PACKAGE_NAME, REPO_OWNER } from '../constants';
import { getWorkspaceRoot } from '../services/project';
import {
  NgxValidationResult,
  NgxPackageJson,
  PackageReadResult,
  PackageValidationResult
} from '../models/commands';

export function getOrCreateTerminal(name: string): vscode.Terminal {
  const existing = vscode.window.terminals.find(t => t.name === name);
  if (existing) {
    return existing;
  }
  return vscode.window.createTerminal(name);
}

export async function requireNgxPath(
  config: vscode.WorkspaceConfiguration,
  warningMessage = 'Ngx Module Linker: ngx module path not configured.'
): Promise<string | undefined> {
  const ngxPath = await getNgxModulePath(config);
  if (!ngxPath) {
    vscode.window.showWarningMessage(warningMessage);
    return undefined;
  }
  return ngxPath;
}

export async function requireNgxPathAndRoot(
  config: vscode.WorkspaceConfiguration
): Promise<{ ngxPath: string; root: string } | undefined> {
  const ngxPath = await requireNgxPath(config);
  if (!ngxPath) {
    return undefined;
  }

  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('Ngx Module Linker: No workspace folder detected.');
    return undefined;
  }

  return { ngxPath, root };
}

async function findProjectRoot(startPath: string): Promise<string | undefined> {
  let current = path.resolve(startPath);

  while (true) {
    const pkgPath = path.join(current, 'package.json');
    try {
      await fs.promises.access(pkgPath);
      return current;
    } catch {
      // continue walking up
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}

async function readNgxPackageJson(packageJsonPath: string): Promise<PackageReadResult> {
  let raw: string;
  try {
    raw = await fs.promises.readFile(packageJsonPath, 'utf8');
  } catch {
    return {
      ok: false,
      error: 'Failed to read package.json in the detected project root.'
    };
  }

  try {
    const pkg = JSON.parse(raw) as NgxPackageJson;
    return { ok: true, pkg };
  } catch {
    return {
      ok: false,
      error: 'package.json in the detected project root is not valid JSON.'
    };
  }
}

function validateNgxPackageJson(pkg: NgxPackageJson): PackageValidationResult {
  if (pkg.name !== NGX_PACKAGE_NAME) {
    return {
      ok: false,
      error: `package.json name is "${pkg.name}", expected "${NGX_PACKAGE_NAME}".`
    };
  }

  const owners = Array.isArray(pkg.repoOwner) ? (pkg.repoOwner as unknown[]) : [];
  const repoOwner = owners.find(owner => owner === REPO_OWNER) as string | undefined;

  if (!repoOwner) {
    return {
      ok: false,
      error: `the repoOwner in package.json is missing, expected "${REPO_OWNER}".`
    };
  }

  if (repoOwner !== REPO_OWNER) {
    return {
      ok: false,
      error: `the repoOwner in package.json is "${repoOwner}", expected "${REPO_OWNER}".`
    };
  }

  return { ok: true };
}

export async function validateNgxPathAndGetRoot(inputPath: string): Promise<NgxValidationResult> {
  const normalized = path.resolve(inputPath);

  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(normalized);
  } catch {
    return { ok: false, error: 'Selected path does not exist.' };
  }

  const startDir = stat.isDirectory() ? normalized : path.dirname(normalized);

  const root = await findProjectRoot(startDir);
  if (!root) {
    return {
      ok: false,
      error: 'Could not find a package.json in the selected path or any of its parent folders.'
    };
  }

  const packageJsonPath = path.join(root, 'package.json');
  const readResult = await readNgxPackageJson(packageJsonPath);
  if (!readResult.ok) {
    return { ok: false, error: readResult.error };
  }

  const validationResult = validateNgxPackageJson(readResult.pkg);
  if (!validationResult.ok) {
    return { ok: false, error: validationResult.error };
  }

  return { ok: true, rootPath: root };
}

export async function isCurrentWorkspaceNgxProject(): Promise<boolean> {
  const root = getWorkspaceRoot();
  if (!root) {
    return false;
  }

  const packageJsonPath = path.join(root, 'package.json');
  const readResult = await readNgxPackageJson(packageJsonPath);
  if (!readResult.ok) {
    return false;
  }

  const validationResult = validateNgxPackageJson(readResult.pkg);
  return validationResult.ok;
}

export function runTerminalCommands(cwd: string, commands: string[]): void {
  const terminal = getOrCreateTerminal('ngx-module');
  terminal.show(true);
  terminal.sendText(`cd "${cwd}"`);
  for (const cmd of commands) {
    terminal.sendText(cmd);
  }
}
