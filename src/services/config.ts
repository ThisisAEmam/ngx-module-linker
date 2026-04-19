import * as vscode from 'vscode';

export function getNgxModulePath(config: vscode.WorkspaceConfiguration): string | undefined {
  const ngxPath = config.get<string>('ngxModulePath');
  if (ngxPath && ngxPath.trim().length > 0) {
    return ngxPath;
  }
  return undefined;
}

export function getSimplicityApachePath(config: vscode.WorkspaceConfiguration): string | undefined {
  const path = config.get<string>('simplicityApachePath');
  if (path && path.trim().length > 0) {
    return path;
  }
  return undefined;
}

export function getselectedNodeVersion(config: vscode.WorkspaceConfiguration): string | undefined {
  const version = config.get<string>('selectedNodeVersion');
  if (version && version.trim().length > 0) {
    return version;
  }
  return undefined;
}
