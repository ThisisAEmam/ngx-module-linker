import * as vscode from 'vscode';
import { getWorkspaceRoot, isEligibleProject } from './services/project';
import { updateStatusBar, disposeStatusBar } from './ui/statusBar';
import { openControlPanel } from './ui/controlPanel';
import {
  handleConfigurePath,
  handleSwitchBranch,
  handleBuildLib,
  handleBuildAndLink
} from './commands';

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('ngxModuleLinker');
  const root = getWorkspaceRoot();

  if (!root) {
    return;
  }

  if (!isEligibleProject(root, config)) {
    return;
  }

  await updateStatusBar(root, config);

  context.subscriptions.push(
    vscode.commands.registerCommand('ngxModuleLinker.openPanel', async () => {
      await openControlPanel(root, config);
    }),
    vscode.commands.registerCommand('ngxModuleLinker.configurePath', async () => {
      await handleConfigurePath(root, config);
    }),
    vscode.commands.registerCommand('ngxModuleLinker.switchBranch', async () => {
      await handleSwitchBranch(config);
    }),
    vscode.commands.registerCommand('ngxModuleLinker.buildLib', async () => {
      await handleBuildLib(config);
    }),
    vscode.commands.registerCommand('ngxModuleLinker.buildAndLinkLib', async () => {
      await handleBuildAndLink(config);
      await updateStatusBar(root, config);
    })
  );
}

export function deactivate() {
  disposeStatusBar();
}
