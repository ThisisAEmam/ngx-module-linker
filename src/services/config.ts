import * as vscode from 'vscode';

export function readNgxModulePath(config: vscode.WorkspaceConfiguration): string | undefined {
  const actual = vscode.workspace.getConfiguration('ngxModuleLinker');
  const ngxPath = actual.get<string>('ngxModulePath');
  if (ngxPath && ngxPath.trim().length > 0) {
    return ngxPath;
  }
  return undefined;
}

export async function getNgxModulePath(config: vscode.WorkspaceConfiguration): Promise<string | undefined> {
  const actual = vscode.workspace.getConfiguration('ngxModuleLinker');
  const existing = readNgxModulePath(actual);
  if (existing) {
    return existing;
  }

  return undefined;
}
