import * as vscode from 'vscode';

export function getNgxModulePath(config: vscode.WorkspaceConfiguration): string | undefined {
  const ngxPath = config.get<string>('ngxModulePath');
  if (ngxPath && ngxPath.trim().length > 0) {
    return ngxPath;
  }
  return undefined;
}
