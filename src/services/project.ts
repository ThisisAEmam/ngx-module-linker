import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_OWNER } from '../constants';

export function getWorkspaceRoot(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }
  return folders[0].uri.fsPath;
}

export function isEligibleProject(root: string, config: vscode.WorkspaceConfiguration): boolean {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    const repoOwner = pkg.repoOwner as string | undefined;
    const name = pkg.name as string | undefined;
    const allowed = config.get<string[]>('allowedProjects') ?? [];
    if (repoOwner === REPO_OWNER && name && allowed.includes(name)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
