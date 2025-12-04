import * as vscode from 'vscode';
import { readNgxModulePath, getNgxModulePath } from '../services/config';
import { getCurrentBranch } from '../services/git';
import { isLinked } from '../services/link';
import {
  handleBuildLib,
  handleBuildAndLink,
  handleSwitchBranch,
  handleConfigurePath,
  handleLink
} from '../commands';
import { updateStatusBar } from './statusBar';

interface PanelState {
  ngxPath?: string;
  branch?: string;
  linked: boolean;
}

async function loadState(projectRoot: string | undefined, config: vscode.WorkspaceConfiguration): Promise<PanelState> {
  const ngxPath = readNgxModulePath(config);
  if (!ngxPath) {
    return {
      ngxPath: undefined,
      branch: undefined,
      linked: false
    };
  }

  const branch = await getCurrentBranch(ngxPath);
  const linked = projectRoot ? isLinked(projectRoot, ngxPath) : false;

  return {
    ngxPath,
    branch,
    linked
  };
}

export class NgxSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ngxModuleLinker.view';

  private view: vscode.WebviewView | undefined;

  constructor(private readonly projectRoot: string | undefined, private config: vscode.WorkspaceConfiguration) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.onDidReceiveMessage(async message => {
      switch (message.type) {
        case 'buildLib': {
          await handleBuildLib(this.config);
          break;
        }
        case 'link': {
          await handleLink(this.config);
          if (this.projectRoot) {
            await updateStatusBar(this.projectRoot, this.config);
          }
          await this.refresh();
          break;
        }
        case 'buildAndLink': {
          await handleBuildAndLink(this.config);
          if (this.projectRoot) {
            await updateStatusBar(this.projectRoot, this.config);
          }
          await this.refresh();
          break;
        }
        case 'changeBranch': {
          await handleSwitchBranch(this.config);
          if (this.projectRoot) {
            await updateStatusBar(this.projectRoot, this.config);
          }
          await this.refresh();
          break;
        }
        case 'savePath': {
          if (typeof message.path === 'string') {
            await this.config.update('ngxModulePath', message.path, vscode.ConfigurationTarget.Global);
            if (this.projectRoot) {
              await updateStatusBar(this.projectRoot, this.config);
            }
            await this.refresh();
          }
          break;
        }
        case 'browsePath': {
          const pick = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select ngx module folder'
          });
          if (pick && pick.length > 0) {
            const selected = pick[0].fsPath;
            await this.config.update('ngxModulePath', selected, vscode.ConfigurationTarget.Global);
            if (this.projectRoot) {
              await updateStatusBar(this.projectRoot, this.config);
            }
            await this.refresh();
          }
          break;
        }
        case 'configurePath': {
          await getNgxModulePath(this.config);
          if (this.projectRoot) {
            await updateStatusBar(this.projectRoot, this.config);
          }
          await this.refresh();
          break;
        }
        case 'refresh': {
          await this.refresh();
          break;
        }
        default:
          break;
      }
    });

    return this.refresh();
  }

  public async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }
    const state = await loadState(this.projectRoot, this.config);
    this.view.webview.html = renderHtml(this.view.webview, state);
  }

  public updateConfiguration(config: vscode.WorkspaceConfiguration): void {
    this.config = config;
  }
}

function renderHtml(webview: vscode.Webview, state: PanelState): string {
  const hasPath = !!state.ngxPath;
  const currentBranch = state.branch ?? 'Unknown';
  const linkStatus = state.linked ? 'Linked' : 'Not Linked';

  const nonce = Date.now().toString();

  const baseStyles = `
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--vscode-foreground);
      background-color: var(--vscode-sideBar-background);
    }
    .panel {
      padding: 12px;
    }
    .title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .subtitle {
      font-size: 11px;
      opacity: 0.8;
      margin-bottom: 8px;
    }
    .section {
      margin-bottom: 10px;
      font-size: 11px;
    }
    .label {
      font-weight: 600;
      margin-bottom: 2px;
    }
    .value {
      opacity: 0.9;
    }
    .status-pill {
      display: inline-block;
      padding: 6px 10px 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      background-color: ${state.linked ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconErrored)'};
      color: var(--vscode-button-foreground);
      margin: 6px 0;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .current-branch {
      padding: 6px 10px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      width: fit-content;
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      margin: 6px 0;
    }
    .button-row {
      display: flex;
      flex-direction: row;
      gap: 6px;
      margin-top: 8px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      min-height: 28px;
    }
    button {
      cursor: pointer;
      border-radius: 4px;
      border: 1px solid var(--vscode-button-border, transparent);
      padding: 6px 12px;
      font-size: 12px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      text-align: center;
      white-space: nowrap;
      box-sizing: border-box;
      transition: all 0.2s ease;
      outline: none;
      flex: 1;
    }
    button:hover {
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      opacity: 0.8;
      color: #fff;
      transform: translateY(-1px);
    }
    button.primary {
      background-color: var(--vscode-testing-iconErrored);
      color: #fff;
      border-color: var(--vscode-testing-iconErrored);
    }
    button.primary:hover {
      background-color: var(--vscode-testing-iconErrored);
      border-color: var(--vscode-testing-iconErrored);
    }
    button.secondary {
      background-color: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-color: var(--vscode-button-border, transparent);
    }
    button.secondary:hover {
      background-color: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-button-border, transparent);
    }
    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--vscode-editorWidget-border);
      margin-bottom: 8px;
      padding-bottom: 4px;
      font-size: 12px;
    }
    .tab {
      padding: 5px 12px;
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
      margin: 4px 0;
      font-size: 12px;
      border-radius: 4px;
      border: 1px solid transparent;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      transition: border-color 0.2s ease;
    }
    .settings-input:focus {
      border-color: var(--vscode-focusBorder);
    }
    .settings-actions {
      margin-top: 6px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
  `;

  const contentIfNoPath = `
    <div class="panel" id="tab-settings">
      <div class="tabs">
        <div class="tab active" data-tab="settings">Settings</div>
      </div>
      <div class="title">Settings</div>
      <div class="section">
        <div class="label">Ngx module path</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input class="settings-input" id="ngxPathInput" value="" />
          <button class="primary" id="browsePathBtn">Browse</button>
        </div>
        <div class="subtitle">This value is stored in the VS Code setting <code>ngxModuleLinker.ngxModulePath</code>.</div>
        <div class="settings-actions">
          <button id="settingsCancelBtn">Cancel</button>
          <button class="primary" id="settingsSaveBtn">Save</button>
        </div>
      </div>
    </div>
  `;

  const linkerTab = `
    <div class="panel" id="tab-linker">
      <div class="tabs">
        <div class="tab active" data-tab="linker">Linker</div>
        <div class="tab inactive" data-tab="settings">Settings</div>
      </div>
      <div class="title">Ngx Module Linker</div>
      <div class="subtitle">Quick overview and actions for the shared ngx module library.</div>
      <div class="section">
        <div class="label">Status</div>
        <div class="status-pill">${linkStatus}</div>
      </div>
      <div class="section">
        <div class="label">Current branch</div>
        <div class="value current-branch">${currentBranch}</div>
      </div>
      <div class="section">
        <div class="label">Ngx module path</div>
        <div class="value">${state.ngxPath}</div>
      </div>
      <div class="section">
        <div class="label">Actions</div>
        <div class="button-row">
          <button id="buildLibBtn">Build</button>
          <button id="linkBtn">Link</button>
          <button id="buildAndLinkBtn">Build & Link</button>
          <button id="changeBranchBtn">Change Git branch</button>
        </div>
      </div>
    </div>
  `;

  const settingsTab = `
    <div class="panel" id="tab-settings" style="display:none;">
      <div class="tabs">
        <div class="tab inactive" data-tab="linker">Linker</div>
        <div class="tab active" data-tab="settings">Settings</div>
      </div>
      <div class="title">Settings</div>
      <div class="section">
        <div class="label">Ngx module path</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input class="settings-input" id="ngxPathInput" value="${state.ngxPath ?? ''}" />
          <button id="browsePathBtn">Browse</button>
        </div>
        <div class="subtitle">This value is stored in the VS Code setting <code>ngxModuleLinker.ngxModulePath</code>.</div>
        <div class="settings-actions">
          <button class="secondary" id="settingsCancelBtn">Cancel</button>
          <button id="settingsSaveBtn">Save</button>
        </div>
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
