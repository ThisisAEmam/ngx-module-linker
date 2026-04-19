import * as vscode from 'vscode';
import { exec } from 'child_process';
import { getNgxModulePath, getSimplicityApachePath, getselectedNodeVersion } from '../services/config';
import { getCurrentBranch } from '../services/git';
import { isLinked } from '../services/link';
import {
  validateNgxPathAndGetRoot,
  isCurrentWorkspaceNgxProject
} from '../commands/index';
import { Messages } from '../messages';
import { PanelState } from '../models/sidebar';
import { updateStatusBar } from './statusBar';
import { SidebarTab } from '../models/tab';
import { LinkerTab } from './tabs/linkerTab';
import { SettingsTab } from './tabs/settingsTab';
import { SimplicityApacheTab } from './tabs/simplicityApacheTab';
import { NVM_CHECK_COMMAND, BUN_CHECK_COMMAND, NODEVM_CHECK_COMMAND } from '../constants';
import { checkSimplicityCommand } from '../commands/simplicityCommands';

async function loadState(
  projectRoot: string | undefined,
  config: vscode.WorkspaceConfiguration,
  isNgxProject: boolean
): Promise<PanelState> {
  const ngxPath = getNgxModulePath(config);
  const simplicityApachePath = getSimplicityApachePath(config);
  const selectedNodeVersion = getselectedNodeVersion(config);
  
  const isWindows = process.platform === 'win32';
  const os: 'windows' | 'linux' | 'macos' = isWindows ? 'windows' : (process.platform === 'darwin' ? 'macos' : 'linux');
  
  const [isNvmInstalled, isBunInstalled, isNodevmInstalled] = await Promise.all([
    !isWindows ? checkSimplicityCommand(NVM_CHECK_COMMAND) : Promise.resolve(false),
    isWindows ? checkSimplicityCommand(BUN_CHECK_COMMAND) : Promise.resolve(false),
    isWindows ? checkSimplicityCommand(NODEVM_CHECK_COMMAND) : Promise.resolve(false),
  ]);

  let branch;
  let linked = false;
  if (ngxPath) {
    branch = await getCurrentBranch(ngxPath);
    linked = projectRoot ? isLinked(projectRoot, ngxPath) : false;
  }

  return {
    ngxPath,
    branch,
    linked,
    isNgxProject,
    os,
    isNvmInstalled,
    isBunInstalled,
    isNodevmInstalled,
    simplicityApachePath,
    selectedNodeVersion
  };
}

export class NgxSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'ngxModuleLinker.view';

  private view: vscode.WebviewView | undefined;
  private isNgxProject: boolean | undefined;
  private lastLinked: boolean | undefined;
  private pollingIntervalId: NodeJS.Timeout | undefined;
  private pollingStartTime: number | undefined;
  private pollingInitialLinked: boolean | undefined;
  private tabs: SidebarTab[] = [new LinkerTab(), new SettingsTab(), new SimplicityApacheTab()];

  constructor(private readonly projectRoot: string | undefined, private config: vscode.WorkspaceConfiguration) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.onDidReceiveMessage(async message => {
      let shouldRefresh = true;

      if (message.type === 'refresh') {
        shouldRefresh = true;
      } else {
        shouldRefresh = false;
        for (const tab of this.tabs) {
          if (tab.handleMessage) {
            const result = await tab.handleMessage(message, this.config, webviewView.webview);
            if (result.handled) {
              if (result.shouldRefresh) {
                shouldRefresh = true;
              }
              if (result.startPolling) {
                this.startStatusPolling();
              }
              break;
            }
          }
        }
      }

      if (shouldRefresh) {
        await this.refreshAndUpdateStatusBar();
      }
    });

    webviewView.onDidChangeVisibility(async () => {
      if (webviewView.visible) {
        void this.validateNgxPathAndRefresh();
      }
    });

    if (webviewView.visible) {
      void this.validateNgxPathAndRefresh();
    }

    return this.refresh();
  }

  private async validateNgxPathAndRefresh() {
    const ngxPath = getNgxModulePath(this.config);
    if (ngxPath) {
      const result = await validateNgxPathAndGetRoot(ngxPath);
      if (!result.ok) {
        await this.config.update('ngxModulePath', undefined, vscode.ConfigurationTarget.Global);
        vscode.window.showErrorMessage(Messages.ui.pathValidationErrorPrefix(result.error));
      }
    }

    const state = await loadState(this.projectRoot, this.config, !!this.isNgxProject);
    const isWindows = state.os === 'windows';
    const isReady = isWindows ? (state.isBunInstalled && state.isNodevmInstalled) : state.isNvmInstalled;

    if (isReady && state.selectedNodeVersion) {
      // Import dynamically or ensure it's imported at the top
      const { handleUseNodeVersion } = require('../commands/simplicityCommands');
      await handleUseNodeVersion(this.config, state.selectedNodeVersion);
    }

    await this.refreshAndUpdateStatusBar();
  }

  private async refreshAndUpdateStatusBar(): Promise<void> {
    await this.refresh();
    if (this.projectRoot) {
      await updateStatusBar(this.projectRoot, this.config);
    }
    this.maybeStopPollingAfterRefresh();
  }

  private async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }
    this.config = vscode.workspace.getConfiguration('ngxModuleLinker');
    const isNgxProject =
      this.isNgxProject !== undefined ? this.isNgxProject : await isCurrentWorkspaceNgxProject();
    this.isNgxProject = isNgxProject;
    const state = await loadState(this.projectRoot, this.config, isNgxProject);
    this.lastLinked = state.linked;
    this.view.webview.html = renderHtml(this.view.webview, state, this.tabs);
  }

  private startStatusPolling(): void {
    const now = Date.now();
    this.pollingStartTime = now;
    this.pollingInitialLinked = this.lastLinked;

    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = undefined;
    }

    const maxDurationMs = 3 * 60 * 1000;

    this.pollingIntervalId = setInterval(() => {
      if (!this.pollingStartTime) {
        return;
      }

      const elapsed = Date.now() - this.pollingStartTime;
      if (elapsed > maxDurationMs) {
        this.stopStatusPolling();
        return;
      }

      void this.refreshAndUpdateStatusBar();
    }, 3000);
  }

  private stopStatusPolling(): void {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = undefined;
    }
    this.pollingStartTime = undefined;
    this.pollingInitialLinked = undefined;
  }

  private maybeStopPollingAfterRefresh(): void {
    if (!this.pollingIntervalId) {
      return;
    }
    if (this.pollingInitialLinked === undefined || this.lastLinked === undefined) {
      return;
    }
    if (this.pollingInitialLinked !== this.lastLinked) {
      this.stopStatusPolling();
    }
  }
}

function renderHtml(webview: vscode.Webview, state: PanelState, tabs: SidebarTab[]): string {
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
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 11px;
      opacity: 0.8;
      margin-bottom: 10px;
      margin-top: 4px;
    }
    .warning {
      color: var(--vscode-editorWarning-foreground);
    }
    .section {
      margin-bottom: 10px;
      font-size: 11px;
    }
    .section-xl {
      margin-top: 16px;
    }
    .label {
      font-weight: 600;
      margin-bottom: 2px;
    }
    .value {
      opacity: 0.9;
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
      // transform: translateY(-1px);
    }
    button:disabled {
      opacity: 0.5;
      cursor: default;
      box-shadow: none;
      transform: none;
    }
    button:disabled:hover {
      box-shadow: none;
      opacity: 0.5;
      transform: none;
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
  `;
  const tabStyles = tabs.map(t => t.getStyles ? t.getStyles() : '').join('\n');

  const visibleTabs = tabs.filter(t => t.isVisible(state));

  const tabHeaders = `
    <div class="tabs" style="padding: 12px 12px 0 12px; margin-bottom: 0;">
      ${visibleTabs.map((t, i) => `
        <div class="tab ${i === 0 ? 'active' : 'inactive'}" data-tab="${t.id}">${t.title}</div>
      `).join('')}
    </div>
  `;

  const tabContents = visibleTabs.map((t, i) => `
    <div class="tab-container panel" id="container-${t.id}" style="${i === 0 ? '' : 'display:none;'}">
      ${t.getHtml(state)}
    </div>
  `).join('');

  const tabScripts = tabs.map(t => t.getScripts ? t.getScripts(nonce) : '').join('\n');

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        ${baseStyles}
        ${tabStyles}
      </style>
    </head>
    <body>
      ${tabHeaders}
      ${tabContents}
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function bindTabEvents() {
          const tabs = document.querySelectorAll('.tab');
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              const target = tab.getAttribute('data-tab');
              if (!target) {
                return;
              }
              
              document.querySelectorAll('.tab-container').forEach(c => {
                c.style.display = c.id === 'container-' + target ? '' : 'none';
              });

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
        }

        window.addEventListener('load', () => {
          bindTabEvents();
          ${tabScripts}
        });
      </script>
    </body>
  </html>`;
}
