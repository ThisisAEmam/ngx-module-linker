import * as vscode from 'vscode';

export async function getNgxModulePath(config: vscode.WorkspaceConfiguration): Promise<string | undefined> {
  let ngxPath = config.get<string>('ngxModulePath');
  if (ngxPath && ngxPath.trim().length > 0) {
    return ngxPath;
  }

  const pick = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Select ngx-module project folder'
  });

  if (!pick || pick.length === 0) {
    return undefined;
  }

  ngxPath = pick[0].fsPath;
  await config.update('ngxModulePath', ngxPath, vscode.ConfigurationTarget.Global);
  return ngxPath;
}
