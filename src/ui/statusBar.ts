import * as vscode from 'vscode';
import { getNgxModulePath } from '../services/config';
import { getCurrentBranch } from '../services/git';
import { isLinked } from '../services/link';

let statusBarItem: vscode.StatusBarItem | undefined;

export async function updateStatusBar(projectRoot: string, config: vscode.WorkspaceConfiguration): Promise<void> {
  const ngxPath = await getNgxModulePath(config);
  if (!ngxPath) {
    if (statusBarItem) {
      statusBarItem.hide();
    }
    return;
  }

  const branch = await getCurrentBranch(ngxPath);
  const linked = isLinked(projectRoot, ngxPath);

  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'ngxModuleLinker.switchBranch';
    statusBarItem.show();
  }

  const branchLabel = branch ?? 'no-git';
  const linkedLabel = linked ? 'linked' : 'unlinked';
  statusBarItem.text = `$(git-branch) ngx-module: ${branchLabel} [${linkedLabel}]`;
  statusBarItem.tooltip = 'Ngx Module Linker';
  statusBarItem.show();
}

export function disposeStatusBar(): void {
  if (statusBarItem) {
    statusBarItem.dispose();
    statusBarItem = undefined;
  }
}
