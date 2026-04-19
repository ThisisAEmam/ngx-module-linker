import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { 
  NVM_INSTALL_CURL_COMMAND, 
  NODE_VERSION_USE_COMMAND, 
  NODE_VERSION_INSTALL_COMMAND,
  NVM_CHECK_COMMAND, 
  BUN_CHECK_COMMAND, 
  NODEVM_CHECK_COMMAND 
} from '../constants';



export const checkSimplicityCommand = (cmd: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // For NVM on Unix
    if (cmd === NVM_CHECK_COMMAND && process.platform !== 'win32') {
      const nvmWrapper = 'export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && ';
      exec(nvmWrapper + cmd, { shell: '/bin/bash' }, (error) => {
        resolve(!error);
      });
      return;
    }

    // For Windows commands, try the command directly first
    exec(cmd, (error) => {
      if (!error) {
        resolve(true);
        return;
      }
      
      // Fallback for Windows freshly installed binaries not in PATH
      if (process.platform === 'win32') {
        const userProfile = process.env.USERPROFILE || '';
        const appData = process.env.APPDATA || '';
        
        if (cmd === BUN_CHECK_COMMAND && userProfile) {
          const bunPath = path.join(userProfile, '.bun', 'bin', 'bun.exe');
          if (fs.existsSync(bunPath)) {
            resolve(true);
            return;
          }
        }
        
        if (cmd === NODEVM_CHECK_COMMAND && appData) {
          const nodevmPath = path.join(appData, 'npm', 'nodevm.cmd');
          if (fs.existsSync(nodevmPath)) {
            resolve(true);
            return;
          }
        }
      }
      
      resolve(false);
    });
  });
};

export async function handleSetupNvm() {
  const terminal = vscode.window.createTerminal('NVM Setup');
  terminal.show();
  terminal.sendText(NVM_INSTALL_CURL_COMMAND);
}

export async function handleSetupBun() {
  const scriptPath = path.join(__dirname, '../../assets/nodevm/install-bun.bat');
  const terminal = vscode.window.createTerminal('Bun Setup');
  terminal.show();
  terminal.sendText(`"${scriptPath}"`);
}

export async function handleSetupNodevm() {
  const scriptPath = path.join(__dirname, '../../assets/nodevm/setup-nodevm.bat');
  const terminal = vscode.window.createTerminal('Nodevm Setup');
  terminal.show();
  terminal.sendText(`"${scriptPath}"`);
}

function execPromise(command: string): Promise<{ stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function handleUseNodeVersion(config: vscode.WorkspaceConfiguration, version: string) {
  await config.update('simplicityApacheNodeVersion', version, vscode.ConfigurationTarget.Global);
  
  const isWindows = process.platform === 'win32';
  const executable = isWindows ? 'nodevm' : 'nvm';
  const useCmd = NODE_VERSION_USE_COMMAND(executable, version);

  try {
    // We run the use command silently. If it fails, it usually means the version is not installed.
    // For NVM on non-windows, nvm might not be in the PATH of child_process.exec directly. 
    // We try to execute it by loading nvm first if needed.
    const runCmd = isWindows ? useCmd : `source ~/.nvm/nvm.sh && ${useCmd}`;
    await execPromise(runCmd);
    vscode.window.showInformationMessage(`Successfully set Node version to ${version}`);
  } catch (err) {
    const installMsg = `Node version ${version} is not installed. Do you want to install it?`;
    const installAction = 'Install';
    const result = await vscode.window.showWarningMessage(installMsg, installAction);
    
    if (result === installAction) {
      const installCmd = NODE_VERSION_INSTALL_COMMAND(executable, version);
      const terminal = vscode.window.createTerminal(`Install Node ${version}`);
      terminal.show();
      terminal.sendText(installCmd);
      // Also send the use command afterwards so it's active in that terminal
      terminal.sendText(useCmd);
    }
  }
}

export async function handleSaveSimplicityPath(config: vscode.WorkspaceConfiguration, path: string) {
  await config.update('simplicityApachePath', path, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage('Simplicity Apache Path saved successfully.');
}

export async function handleBrowseSimplicityPath(config: vscode.WorkspaceConfiguration) {
  const uris = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Select Simplicity Apache App Root'
  });

  if (uris && uris.length > 0) {
    const selectedPath = uris[0].fsPath;
    await config.update('simplicityApachePath', selectedPath, vscode.ConfigurationTarget.Global);
  }
}
