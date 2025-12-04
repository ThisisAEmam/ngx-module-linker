import * as vscode from 'vscode';
import { readNgxModulePath, getNgxModulePath } from '../services/config';
import { getCurrentBranch } from '../services/git';
import { isLinked } from '../services/link';
import { handleBuildLib, handleBuildAndLink, handleSwitchBranch, handleLink } from '../commands';
import { updateStatusBar } from './statusBar';

interface PanelState {
  ngxPath?: string;
  branch?: string;
  linked: boolean;
}

let panel: vscode.WebviewPanel | undefined;

export async function openControlPanel(projectRoot: string, config: vscode.WorkspaceConfiguration): Promise<void> {
  const state = await loadState(projectRoot, config);

  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      'ngxModuleLinkerPanel',
      'Ngx Module Linker',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    panel.onDidDispose(() => {
      panel = undefined;
    });

    panel.webview.onDidReceiveMessage(async message => {
      switch (message.type) {
        case 'configurePath': {
          await getNgxModulePath(config);
          await updateStatusBar(projectRoot, config);
          await refresh(projectRoot, config);
          break;
        }
        case 'buildLib': {
          await handleBuildLib(config);
          break;
        }
        case 'buildAndLink': {
          await handleBuildAndLink(config);
          await updateStatusBar(projectRoot, config);
          await refresh(projectRoot, config);
          break;
        }
        case 'link': {
          await handleLink(config);
          await updateStatusBar(projectRoot, config);
          await refresh(projectRoot, config);
          break;
        }
        case 'changeBranch': {
          await handleSwitchBranch(config);
          await updateStatusBar(projectRoot, config);
          await refresh(projectRoot, config);
          break;
        }
        case 'savePath': {
          if (typeof message.path === 'string') {
            const updatedConfig = vscode.workspace.getConfiguration('ngxModuleLinker');
            await updatedConfig.update('ngxModulePath', message.path, vscode.ConfigurationTarget.Global);
            await updateStatusBar(projectRoot, updatedConfig);
            await refresh(projectRoot, updatedConfig);
          }
          break;
        }
        case 'browsePath': {
          const pick = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Folder'
          });

          if (pick && pick.length > 0) {
            const selected = pick[0].fsPath;
            const updatedConfig = vscode.workspace.getConfiguration('ngxModuleLinker');
            await updatedConfig.update('ngxModulePath', selected, vscode.ConfigurationTarget.Global);
            await updateStatusBar(projectRoot, updatedConfig);
            await refresh(projectRoot, updatedConfig);
          }
          break;
        }
        case 'refresh': {
          const updatedConfig = vscode.workspace.getConfiguration('ngxModuleLinker');
          await refresh(projectRoot, updatedConfig);
          break;
        }
        default:
          break;
      }
    });
  } else {
    panel.reveal(vscode.ViewColumn.Beside);
  }

  panel.webview.html = renderHtml(panel.webview, state);
}

async function refresh(projectRoot: string, config: vscode.WorkspaceConfiguration): Promise<void> {
  if (!panel) {
    return;
  }
  const state = await loadState(projectRoot, config);
  panel.webview.html = renderHtml(panel.webview, state);
}

async function loadState(projectRoot: string, config: vscode.WorkspaceConfiguration): Promise<PanelState> {
  const ngxPath = readNgxModulePath(config);
  if (!ngxPath) {
    return {
      ngxPath: undefined,
      branch: undefined,
      linked: false
    };
  }

  const branch = await getCurrentBranch(ngxPath);
  const linked = isLinked(projectRoot, ngxPath);

  return {
    ngxPath,
    branch,
    linked
  };
}

function renderHtml(webview: vscode.Webview, state: PanelState): string {
  const hasPath = !!state.ngxPath;
  const currentBranch = state.branch ?? 'Unknown';
  const linkStatus = state.linked ? 'Linked' : 'Not linked';

  const nonce = Date.now().toString();

  const baseStyles = `
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .panel {
      padding: 12px 16px 8px 16px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 12px;
      opacity: 0.8;
      margin-bottom: 12px;
    }
    .section {
      margin-bottom: 12px;
      font-size: 12px;
    }
    .label {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .value {
      opacity: 0.9;
    }
    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background-color: ${state.linked ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconErrored)'};
      color: var(--vscode-editor-background);
      margin-bottom: 8px;
    }
    .button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }
    button {
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid var(--vscode-button-border, transparent);
      padding: 4px 10px;
      font-size: 12px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    button.primary {
      background-color: #e60000;
      color: #fff;
      border-color: #e60000;
    }
    button:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .tabs {
      display: flex;
      gap: 8px;
      border-top: 1px solid var(--vscode-editorWidget-border);
      margin-top: 12px;
      padding-top: 8px;
      font-size: 12px;
    }
    .tab {
      padding: 4px 10px;
      border-radius: 999px;
      cursor: pointer;
    }
    .tab.active {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }
    .tab.inactive {
      opacity: 0.7;
    }
    .settings-input {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      margin: 6px 0;
      font-size: 12px;
      border-radius: 4px;
      border: 1px solid var(--vscode-input-border);
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
    }
    .settings-actions {
      margin-top: 8px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .empty-state {
      font-size: 12px;
      margin-bottom: 12px;
    }
  `;

  const contentIfNoPath = `
    <div class="panel" id="tab-settings">
      <div class="title">Settings</div>
      <div class="section">
        <div class="label">Ngx Module path</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input class="settings-input" id="ngxPathInput" value="" />
          <button id="browsePathBtn">Browse</button>
        </div>
        <div class="subtitle">This value is stored in the VS Code setting <code>ngxModuleLinker.ngxModulePath</code>.</div>
        <div class="settings-actions">
          <button id="settingsCancelBtn">Cancel</button>
          <button id="settingsSaveBtn">Save</button>
        </div>
      </div>
    </div>
  `;

  const linkerTab = `
    <div class="panel" id="tab-linker">
      <div class="title">Ngx Module Linker</div>
      <div class="subtitle">Quick overview and actions for the shared ngx-module library.</div>
      <div class="section">
        <div class="label">Status</div>
        <div class="status-pill">${linkStatus}</div>
      </div>
      <div class="section">
        <div class="label">Current branch</div>
        <div class="value">${currentBranch}</div>
      </div>
      <div class="section">
        <div class="label">Ngx Module path</div>
        <div class="value">${state.ngxPath}</div>
      </div>
      <div class="section">
        <div class="label">Actions</div>
        <div class="button-row">
          <button class="primary" id="buildLibBtn">Build</button>
          <button class="primary" id="linkBtn">Link</button>
          <button class="primary" id="buildAndLinkBtn">Build &amp; Link</button>
          <button id="changeBranchBtn">Change Git branch</button>
        </div>
      </div>
      <div class="tabs">
        <div class="tab active" data-tab="linker">Linker</div>
        <div class="tab inactive" data-tab="settings">Settings</div>
      </div>
    </div>
  `;

  const settingsTab = `
    <div class="panel" id="tab-settings" style="display:none;">
      <div class="title">Settings</div>
      <div class="section">
        <div class="label">Ngx-module path</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input class="settings-input" id="ngxPathInput" value="${state.ngxPath ?? ''}" />
          <button class="primary" id="browsePathBtn">Browse</button>
        </div>
        <div class="subtitle">This value is stored in the VS Code setting <code>ngxModuleLinker.ngxModulePath</code>.</div>
        <div class="settings-actions">
          <button id="settingsCancelBtn">Cancel</button>
          <button class="primary" id="settingsSaveBtn">Save</button>
        </div>
      </div>
      <div class="tabs">
        <div class="tab inactive" data-tab="linker">Linker</div>
        <div class="tab active" data-tab="settings">Settings</div>
      </div>
    </div>
  `;

  const bodyContent = hasPath ? linkerTab + settingsTab : contentIfNoPath;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${baseStyles}</style>
</head>
<body>
  ${bodyContent}
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function bindEvents() {
      const buildLibBtn = document.getElementById('buildLibBtn');
      if (buildLibBtn) {
        buildLibBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'buildLib' });
        });
      }

      const linkBtn = document.getElementById('linkBtn');
      if (linkBtn) {
        linkBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'link' });
        });
      }

      const buildAndLinkBtn = document.getElementById('buildAndLinkBtn');
      if (buildAndLinkBtn) {
        buildAndLinkBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'buildAndLink' });
        });
      }

      const changeBranchBtn = document.getElementById('changeBranchBtn');
      if (changeBranchBtn) {
        changeBranchBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'changeBranch' });
        });
      }

      const tabs = document.querySelectorAll('.tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const target = tab.getAttribute('data-tab');
          if (!target) {
            return;
          }
          const linker = document.getElementById('tab-linker');
          const settings = document.getElementById('tab-settings');
          if (linker && settings) {
            if (target === 'linker') {
              linker.style.display = '';
              settings.style.display = 'none';
            } else {
              linker.style.display = 'none';
              settings.style.display = '';
            }
          }
          tabs.forEach(t => {
            if (t.getAttribute('data-tab') === target) {
              t.classList.add('active');
              t.classList.remove('inactive');
            } else {
              t.classList.remove('active');
              t.classList.add('inactive');
            }
          });
        });
      });

      const input = document.getElementById('ngxPathInput');
      const saveBtn = document.getElementById('settingsSaveBtn');
      const cancelBtn = document.getElementById('settingsCancelBtn');
      const browseBtn = document.getElementById('browsePathBtn');

      if (saveBtn && input) {
        saveBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'savePath', path: input.value || '' });
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'refresh' });
        });
      }

      if (browseBtn) {
        browseBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'browsePath' });
        });
      }
    }

    window.addEventListener('load', bindEvents);
  </script>
</body>
</html>`;
}
