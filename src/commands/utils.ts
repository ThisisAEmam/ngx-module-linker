import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getNgxModulePath } from '../services/config';
import { NGX_PACKAGE_NAME, REPO_OWNER } from '../constants';
import { getWorkspaceRoot } from '../services/project';
import { Messages } from '../messages';
import {
  NgxValidationResult,
  NgxPackageJson,
  PackageReadResult,
  PackageValidationResult
} from '../models/commands';

const TERMINAL_NAME_PREFIX = 'Ngx Linker - ';
const TERMINAL_NAME_BY_COMMAND: Record<string, string> = {
  'ngxModuleLinker.buildLib': `${TERMINAL_NAME_PREFIX}Build Library`,
  'ngxModuleLinker.buildAndLink': `${TERMINAL_NAME_PREFIX}Build and Link`,
  'ngxModuleLinker.link': `${TERMINAL_NAME_PREFIX}Link`,
  'ngxModuleLinker.npmStart': `${TERMINAL_NAME_PREFIX}NPM Start`
};

function getTerminalName(commandId: string): string {
  return TERMINAL_NAME_BY_COMMAND[commandId] ?? `${TERMINAL_NAME_PREFIX}${commandId}`;
}

export function getOrCreateTerminal(name: string, forceCreate: boolean = false): vscode.Terminal {
  if (!forceCreate) {
    const existing = vscode.window.terminals.find(t => t.name === name);
    if (existing) {
      if (existing.exitStatus == null) {
        return existing;
      }
    }
  }
  return vscode.window.createTerminal(name);
}

export async function requireNgxPath(
  config: vscode.WorkspaceConfiguration,
  warningMessage = Messages.warnings.ngxPathNotConfigured
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
    vscode.window.showWarningMessage(Messages.warnings.noWorkspaceRoot);
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
      error: Messages.errors.readPackageJsonFailed
    };
  }

  try {
    const pkg = JSON.parse(raw) as NgxPackageJson;
    return { ok: true, pkg };
  } catch {
    return {
      ok: false,
      error: Messages.errors.invalidPackageJson
    };
  }
}

function validateNgxPackageJson(pkg: NgxPackageJson): PackageValidationResult {
  if (pkg.name !== NGX_PACKAGE_NAME) {
    return {
      ok: false,
      error: Messages.errors.packageNameMismatch(pkg.name, NGX_PACKAGE_NAME)
    };
  }

  const owners = Array.isArray(pkg.repoOwner) ? (pkg.repoOwner as unknown[]) : [];
  const repoOwner = owners.find(owner => owner === REPO_OWNER) as string | undefined;

  if (!repoOwner) {
    return {
      ok: false,
      error: Messages.errors.repoOwnerMissing(REPO_OWNER)
    };
  }

  if (repoOwner !== REPO_OWNER) {
    return {
      ok: false,
      error: Messages.errors.repoOwnerMismatch(repoOwner, REPO_OWNER)
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
    return { ok: false, error: Messages.errors.pathDoesNotExist };
  }

  const startDir = stat.isDirectory() ? normalized : path.dirname(normalized);

  const root = await findProjectRoot(startDir);
  if (!root) {
    return {
      ok: false,
      error: Messages.errors.packageJsonNotFoundInPath
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

export function runTerminalCommands(commandId: string, cwd: string, commands: string[]): void {
  const terminal = getOrCreateTerminal(getTerminalName(commandId));
  terminal.show(true);
  terminal.sendText(`cd "${cwd}"`);
  for (const cmd of commands) {
    terminal.sendText(cmd);
  }
}
