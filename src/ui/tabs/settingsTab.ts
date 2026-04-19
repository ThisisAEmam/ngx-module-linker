import * as vscode from 'vscode';
import { SidebarTab, MessageHandlerResult } from '../../models/tab';
import { PanelState } from '../../models/sidebar';
import { Messages } from '../../messages';
import { validateNgxPathAndGetRoot } from '../../commands/index';

export class SettingsTab implements SidebarTab {
  public id = 'settings';
  public title = Messages.ui.tabs.settings;

  public isVisible(state: PanelState): boolean {
    return true; // Always visible
  }

  public getHtml(state: PanelState): string {
    return `
      <div class="title">${Messages.ui.sections.settings}</div>
      <div class="section">
        <div class="label">${Messages.ui.sections.ngxModulePath}</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input class="settings-input" id="ngxPathInput" value="${state.ngxPath ?? ''}" />
          <button id="browsePathBtn">${Messages.ui.buttons.browse}</button>
        </div>
        <div class="settings-actions">
          <button class="secondary" id="settingsCancelBtn">${Messages.ui.buttons.cancel}</button>
          <button id="settingsSaveBtn">${Messages.ui.buttons.save}</button>
        </div>
        <div class="subtitle" style="line-height: 1.5;">${Messages.ui.settingsSubtitle}</div>
        <p id="pathError" class="settings-error" style="display:none;"></p>
      </div>
    `;
  }

  public getStyles(): string {
    return `
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
      .settings-error {
        margin-top: 6px;
        font-size: 11px;
        color: var(--vscode-errorForeground);
      }
    `;
  }

  public getScripts(): string {
    return `
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

      window.addEventListener('message', event => {
        const message = event.data;
        if (!message) {
          return;
        }
        if (message.type === 'pathValidationError') {
          const errorEl = document.getElementById('pathError');
          if (errorEl) {
            errorEl.textContent = message.message || '';
            errorEl.style.display = message.message ? '' : 'none';
          }
        }
      });
    `;
  }

  public async handleMessage(message: any, config: vscode.WorkspaceConfiguration, webview: vscode.Webview): Promise<MessageHandlerResult> {
    switch (message.type) {
      case 'savePath': {
        if (typeof message.path === 'string') {
          const result = await validateNgxPathAndGetRoot(message.path);
          if (!result.ok) {
            vscode.window.showErrorMessage(Messages.ui.pathValidationErrorPrefix(result.error));
            webview.postMessage({
              type: 'pathValidationError',
              message: result.error
            });
            return { handled: true, shouldRefresh: false };
          } else {
            await config.update('ngxModulePath', result.rootPath === '' ? undefined : result.rootPath, vscode.ConfigurationTarget.Global);
            return { handled: true, shouldRefresh: true };
          }
        }
        break;
      }
      case 'browsePath': {
        const pick = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: Messages.ui.buttons.selectNgxFolder
        });
        if (pick && pick.length > 0) {
          const selected = pick[0].fsPath;
          const result = await validateNgxPathAndGetRoot(selected);
          if (!result.ok) {
            vscode.window.showErrorMessage(Messages.ui.pathValidationErrorPrefix(result.error));
            webview.postMessage({
              type: 'pathValidationError',
              message: result.error
            });
            return { handled: true, shouldRefresh: false };
          } else {
            await config.update('ngxModulePath', result.rootPath === '' ? undefined : result.rootPath, vscode.ConfigurationTarget.Global);
            return { handled: true, shouldRefresh: true };
          }
        }
        break;
      }
    }
    return { handled: false };
  }
}
