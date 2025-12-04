import * as vscode from 'vscode';
import { readNgxModulePath } from '../services/config';
import { getCurrentBranch } from '../services/git';
import { isLinked } from '../services/link';

let statusBarItem: vscode.StatusBarItem | undefined;

export async function updateStatusBar(projectRoot: string, config: vscode.WorkspaceConfiguration): Promise<void> {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'ngxModuleLinker.focusView';
    statusBarItem.show();
  }

  const ngxPath = readNgxModulePath(config);
  if (!ngxPath) {
    statusBarItem.text = '$(git-branch) NGX: Not Configured';
    statusBarItem.tooltip = 'Ngx Module Linker: Click to configure ngx module path in settings.';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    statusBarItem.show();
    return;
  }

  const branch = await getCurrentBranch(ngxPath);
  const linked = isLinked(projectRoot, ngxPath);

  const branchLabel = branch ?? 'No Git';
  const linkedLabel = linked ? 'Linked' : 'Not Linked';
  statusBarItem.text = `$(git-branch) NGX: ${branchLabel} [${linkedLabel}]`;
  statusBarItem.tooltip = 'Ngx Module Linker | Click to open panel.';
  statusBarItem.backgroundColor = linked
    ? undefined
    : new vscode.ThemeColor('statusBarItem.warningBackground');
  statusBarItem.show();
}

export function disposeStatusBar(): void {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
