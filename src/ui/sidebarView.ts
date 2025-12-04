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
          break;
        }
        case 'buildAndLink': {
          await handleBuildAndLink(this.config);
          break;
        }
        case 'changeBranch': {
          await handleSwitchBranch(this.config);
          break;
        }
        case 'savePath': {
          if (typeof message.path === 'string') {
            await this.config.update('ngxModulePath', message.path, vscode.ConfigurationTarget.Global);
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
          }
          break;
        }
        case 'configurePath': {
          await getNgxModulePath(this.config);
          break;
        }
        case 'refresh': {
          break;
        }
        default:
          break;
      }
      await this.refreshAndUpdateStatusBar();
    });

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        void this.refreshAndUpdateStatusBar();
      }
    });

    return this.refresh();
  }


  public async refreshAndUpdateStatusBar(): Promise<void> {
    if (this.projectRoot) {
      await updateStatusBar(this.projectRoot, this.config);
    }
    await this.refresh();
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
      margin-bottom: 10px;
      margin-top: 4px;
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
    .status-row {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: space-between;
    }
    .status-pill {
      display: inline-block;
      padding: 5px 10px 4px 10px;
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
    button#refreshBtn {
      width: fit-content;
      flex: none;
      border-radius: 999px;
      padding: 4px;
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
      border-radius: 3px;
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

  const linkerTab = `
    <div class="panel" id="tab-linker">
      <div class="tabs">
        <div class="tab active" data-tab="linker">Linker</div>
        <div class="tab inactive" data-tab="settings">Settings</div>
      </div>
      <div class="section">
        <div class="label">Ngx module path</div>
        <div class="value">${state.ngxPath}</div>
      </div>
      <div class="section">
        <div class="label">Current branch</div>
        <div class="value current-branch">${currentBranch}</div>
      </div>
      <div class="section">
        <div class="label">Status</div>
        <div class="status-row">
          <div class="status-pill">${linkStatus}</div>
          <button id="refreshBtn" title="Refresh Status">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style="vertical-align: text-bottom; fill: currentColor;">
              <path d="M8 1.5c-1.3 0-2.6.46-3.6 1.3A5 5 0 002.1 7h1.4a3.7 3.7 0 011.1-2.5A3.6 3.6 0 018 3.1c.8 0 1.6.27 2.2.77l-1.4 1.4H13V1.8l-1.4 1.4A5.1 5.1 0 008 1.5zm4.9 7.5h-1.4A3.7 3.7 0 0110.4 12 3.6 3.6 0 018 12.9a3.6 3.6 0 01-2.2-.77l1.4-1.4H3v4.4l1.4-1.4A5.1 5.1 0 008 14.5c1.3 0 2.6-.46 3.6-1.3A5 5 0 0013.9 9z" />
            </svg>
          </button>
        </div>
      </div>
      <div class="section">
        <div class="label">Actions</div>
        <div class="button-row">
          <button id="buildLibBtn">Build</button>
          <button id="linkBtn">Link</button>
          <button id="buildAndLinkBtn">Build & Link</button>
          <button id="changeBranchBtn">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style="vertical-align: text-bottom; margin-right: 4px; fill: currentColor;">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            Change Git branch
          </button>
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

      const refreshBtn = document.getElementById('refreshBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'refresh' });
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
