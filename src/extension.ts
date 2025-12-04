import * as vscode from 'vscode';
import { getWorkspaceRoot, isEligibleProject } from './services/project';
import { updateStatusBar, disposeStatusBar } from './ui/statusBar';
import { openControlPanel } from './ui/controlPanel';
import { NgxSidebarProvider } from './ui/sidebarView';
import {
  handleConfigurePath,
  handleSwitchBranch,
  handleBuildLib,
  handleBuildAndLink
} from './commands';

export async function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('ngxModuleLinker');
  const root = getWorkspaceRoot();

  // Register sidebar provider and commands even if the workspace ends up
  // being ineligible, so the view always has a data provider.
  const sidebarProvider = new NgxSidebarProvider(root, config);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(NgxSidebarProvider.viewType, sidebarProvider),
    vscode.commands.registerCommand('ngxModuleLinker.focusView', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.ngxModuleLinker');
    })
  );

  const isEligible = !!(root && isEligibleProject(root, config));
  await vscode.commands.executeCommand('setContext', 'ngxModuleLinker.isEligible', true);

  if (!root || !isEligible) {
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
    vscode.commands.registerCommand('ngxModuleLinker.buildAndLink', async () => {
      await handleBuildAndLink(config);
      await updateStatusBar(root, config);
    })
  );
}

export function deactivate() {
  disposeStatusBar();
}
