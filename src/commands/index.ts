import * as vscode from 'vscode';
import * as path from 'path';
import { listBranches, checkoutBranch } from '../services/git';
import { NGX_DIST_RELATIVE, NGX_PACKAGE_NAME } from '../constants';
import { getWorkspaceRoot } from '../services/project';
import { updateStatusBar } from '../ui/statusBar';
import { requireNgxPath, requireNgxPathAndRoot, runTerminalCommands } from './utils';
import { Messages } from '../messages';

export { validateNgxPathAndGetRoot, isCurrentWorkspaceNgxProject } from './utils';

export async function handleConfigurePath(projectRoot: string, config: vscode.WorkspaceConfiguration) {
  const ngxPath = await requireNgxPath(config);
  if (!ngxPath) {
    return;
  }
  vscode.window.showInformationMessage(Messages.info.usingNgxPath(ngxPath));
  await updateStatusBar(projectRoot, config);
}

export async function handleSwitchBranch(config: vscode.WorkspaceConfiguration) {
  const ngxPath = await requireNgxPath(config);
  if (!ngxPath) {
    return;
  }

  const branches = await vscode.window.withProgress<string[]>(
    {
      location: vscode.ProgressLocation.Notification,
      title: Messages.progress.fetchingBranchesTitle,
      cancellable: false
    },
    async () => {
      try {
        return await listBranches(ngxPath);
      } catch (e: any) {
        vscode.window.showErrorMessage(Messages.errors.listBranches(e.stderr ?? e));
        return [];
      }
    }
  );

  if (branches.length === 0) {
    vscode.window.showInformationMessage(Messages.info.noBranches);
    return;
  }

  const pick = await vscode.window.showQuickPick(branches, {
    placeHolder: 'Select a branch'
  });
  if (!pick) {
    return;
  }

  try {
    await checkoutBranch(ngxPath, pick);
    vscode.window.showInformationMessage(Messages.info.switchedBranch(pick));
  } catch (e: any) {
    vscode.window.showErrorMessage(Messages.errors.checkoutBranch(pick, e.stderr ?? e));
  }

  const root = getWorkspaceRoot();
  if (root) {
    await updateStatusBar(root, config);
  }
}

export async function handleBuildLib(config: vscode.WorkspaceConfiguration) {
  const ngxPath = await requireNgxPath(config);
  if (!ngxPath) {
    return;
  }

  runTerminalCommands(ngxPath, ['npm run build:lib']);
}

export async function handleBuildAndLink(config: vscode.WorkspaceConfiguration) {
  const ctx = await requireNgxPathAndRoot(config);
  if (!ctx) {
    return;
  }

  const ngxDist = path.join(ctx.ngxPath, NGX_DIST_RELATIVE);
  runTerminalCommands(ctx.ngxPath, [
    'npm run build:lib',
    `cd "${ngxDist}"`,
    'npm link',
    `cd "${ctx.root}"`,
    `npm link "${NGX_PACKAGE_NAME}"`
  ]);
}

export async function handleOpenNgxWindow(config: vscode.WorkspaceConfiguration) {
  const ngxPath = await requireNgxPath(config);
  if (!ngxPath) {
    return;
  }

  const uri = vscode.Uri.file(ngxPath);
  await vscode.commands.executeCommand('vscode.openFolder', uri, true);
}

export async function handleNpmStart(config: vscode.WorkspaceConfiguration) {
  const ngxPath = await requireNgxPath(config);
  if (!ngxPath) {
    return;
  }

  runTerminalCommands(ngxPath, ['npm start']);
}

export async function handleLink(config: vscode.WorkspaceConfiguration) {
  const ctx = await requireNgxPathAndRoot(config);
  if (!ctx) {
    return;
  }

  const ngxDist = path.join(ctx.ngxPath, NGX_DIST_RELATIVE);
  runTerminalCommands(ngxDist, [
    'npm link',
    `cd "${ctx.root}"`,
    `npm link "${NGX_PACKAGE_NAME}"`
  ]);
}
