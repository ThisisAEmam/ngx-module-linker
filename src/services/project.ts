import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_OWNER, ALLOWED_PROJECT_NAMES } from '../constants';

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
    const repoOwners = pkg.repoOwner as string[] | undefined;
    const name = pkg.name as string | undefined;
    if (repoOwners?.[0] === REPO_OWNER && name && ALLOWED_PROJECT_NAMES.includes(name)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
