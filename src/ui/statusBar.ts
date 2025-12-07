import * as vscode from 'vscode';
import { getNgxModulePath } from '../services/config';
import { getCurrentBranch } from '../services/git';
import { isLinked } from '../services/link';
import { Messages } from '../messages';

let statusBarItem: vscode.StatusBarItem | undefined;

export async function updateStatusBar(projectRoot: string, config: vscode.WorkspaceConfiguration): Promise<void> {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'ngxModuleLinker.focusView';
    statusBarItem.show();
  }

  const ngxPath = getNgxModulePath(config);
  if (!ngxPath) {
    statusBarItem.text = Messages.status.notConfiguredText;
    statusBarItem.tooltip = Messages.status.notConfiguredTooltip;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    statusBarItem.show();
    return;
  }

  const branch = await getCurrentBranch(ngxPath);
  const linked = isLinked(projectRoot, ngxPath);

  const branchLabel = branch ?? Messages.status.noGitLabel;
  const linkedLabel = linked ? Messages.status.linkedLabel : Messages.status.notLinkedLabel;
  statusBarItem.text = Messages.status.mainText(branchLabel, linkedLabel);
  statusBarItem.tooltip = Messages.status.mainTooltip;
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
