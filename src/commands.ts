import * as vscode from 'vscode';
import * as path from 'path';
import { getNgxModulePath } from './services/config';
import { listBranches, checkoutBranch } from './services/git';
import { NGX_DIST_RELATIVE, NGX_PACKAGE_NAME } from './constants';
import { getWorkspaceRoot } from './services/project';
import { updateStatusBar } from './ui/statusBar';

function getOrCreateTerminal(name: string): vscode.Terminal {
  const existing = vscode.window.terminals.find(t => t.name === name);
  if (existing) {
    return existing;
  }
  return vscode.window.createTerminal(name);
}

async function requireNgxPath(
  config: vscode.WorkspaceConfiguration,
  warningMessage = 'Ngx Module Linker: ngx module path not configured.'
): Promise<string | undefined> {
  const ngxPath = await getNgxModulePath(config);
  if (!ngxPath) {
    vscode.window.showWarningMessage(warningMessage);
    return undefined;
  }
  return ngxPath;
}

async function requireNgxPathAndRoot(
  config: vscode.WorkspaceConfiguration
): Promise<{ ngxPath: string; root: string } | undefined> {
  const ngxPath = await requireNgxPath(config);
  if (!ngxPath) {
    return undefined;
  }

  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('Ngx Module Linker: No workspace folder detected.');
    return undefined;
  }

  return { ngxPath, root };
}

function runTerminalCommands(cwd: string, commands: string[]): void {
  const terminal = getOrCreateTerminal('ngx-module');
  terminal.show(true);
  terminal.sendText(`cd "${cwd}"`);
  for (const cmd of commands) {
    terminal.sendText(cmd);
  }
}

export async function handleConfigurePath(projectRoot: string, config: vscode.WorkspaceConfiguration) {
  const ngxPath = await requireNgxPath(config);
  if (!ngxPath) {
    return;
  }
  vscode.window.showInformationMessage(`Ngx Module Linker: Using ngx-module at ${ngxPath}`);
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
      title: 'Ngx Module Linker: Fetching branches…',
      cancellable: false
    },
    async () => {
      try {
        return await listBranches(ngxPath);
      } catch (e: any) {
        vscode.window.showErrorMessage(
          `Ngx Module Linker: Failed to list branches: ${e.stderr ?? e}`
        );
        return [];
      }
    }
  );

  if (branches.length === 0) {
    vscode.window.showInformationMessage('Ngx Module Linker: No branches found.');
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
    vscode.window.showInformationMessage(`Ngx Module Linker: Switched ngx-module to branch ${pick}.`);
  } catch (e: any) {
    vscode.window.showErrorMessage(`Ngx Module Linker: Failed to checkout branch ${pick}: ${e.stderr ?? e}`);
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
  const terminal = getOrCreateTerminal('ngx-module');
  terminal.show(true);
  terminal.sendText(`cd "${ctx.ngxPath}"`);
  terminal.sendText('npm run build:lib');
  terminal.sendText(`cd "${ngxDist}"`);
  terminal.sendText('npm link');
  terminal.sendText(`cd "${ctx.root}"`);
  terminal.sendText(`npm link "${NGX_PACKAGE_NAME}"`);
}

export async function handleLink(config: vscode.WorkspaceConfiguration) {
  const ctx = await requireNgxPathAndRoot(config);
  if (!ctx) {
    return;
  }

  const ngxDist = path.join(ctx.ngxPath, NGX_DIST_RELATIVE);
  const terminal = getOrCreateTerminal('ngx-module');
  terminal.show(true);
  terminal.sendText(`cd "${ngxDist}"`);
  terminal.sendText('npm link');
  terminal.sendText(`cd "${ctx.root}"`);
  terminal.sendText(`npm link "${NGX_PACKAGE_NAME}"`);
}
