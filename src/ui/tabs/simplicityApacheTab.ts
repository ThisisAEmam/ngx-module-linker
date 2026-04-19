import * as vscode from 'vscode';
import { SidebarTab, MessageHandlerResult } from '../../models/tab';
import { PanelState } from '../../models/sidebar';
import { Messages } from '../../messages';
import { NODE_VERSIONS_LIST } from '../../constants';
import { handleSetupNvm, handleSetupBun, handleSetupNodevm, handleUseNodeVersion, handleSaveSimplicityPath, handleBrowseSimplicityPath } from '../../commands/simplicityCommands';

export class SimplicityApacheTab implements SidebarTab {
  public id = 'simplicityApache';
  public title = Messages.ui.tabs.simplicityApache || 'Simplicity Apache';

  public isVisible(state: PanelState): boolean {
    return true;
  }

  public getHtml(state: PanelState): string {
    const isWindows = state.os === 'windows';
    const isReady = isWindows ? (state.isBunInstalled && state.isNodevmInstalled) : state.isNvmInstalled;

    if (!isReady) {
      if (isWindows) {
        return `
          <div class="title">Setup Requirements</div>
          <div class="section">
            <div class="setup-step ${state.isBunInstalled ? 'completed' : 'pending'}">
              <div class="step-status">
                ${state.isBunInstalled ? '✓' : '1'}
              </div>
              <div class="step-content">
                <div class="label">Setup Bun</div>
                ${!state.isBunInstalled ? `<button id="setupBunBtn" class="primary">Install Bun</button>` : `<div class="subtitle">Bun is installed.</div>`}
              </div>
            </div>
            
            <div class="setup-step ${state.isNodevmInstalled ? 'completed' : (state.isBunInstalled ? 'pending' : 'locked')}">
              <div class="step-status">
                ${state.isNodevmInstalled ? '✓' : '2'}
              </div>
              <div class="step-content">
                <div class="label">Setup Nodevm</div>
                ${state.isNodevmInstalled ? `<div class="subtitle">Nodevm is installed.</div>` : 
                  (state.isBunInstalled ? `<button id="setupNodevmBtn" class="primary">Install Nodevm</button>` : `<div class="subtitle">Requires Bun first.</div>`)}
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="title">Setup Requirements</div>
          <div class="section">
            <div class="setup-step ${state.isNvmInstalled ? 'completed' : 'pending'}">
              <div class="step-status">
                ${state.isNvmInstalled ? '✓' : '1'}
              </div>
              <div class="step-content">
                <div class="label">Setup NVM</div>
                ${!state.isNvmInstalled ? `<button id="setupNvmBtn" class="primary">Install NVM</button>` : `<div class="subtitle">NVM is installed.</div>`}
              </div>
            </div>
          </div>
        `;
      }
    }

    const versionOptions = NODE_VERSIONS_LIST.map(v => 
      `<option value="${v}" ${state.simplicityApacheNodeVersion === v ? 'selected' : ''}>${v}</option>`
    ).join('');

    return `
      <div class="title">Simplicity Apache Configuration</div>
      <div class="section">
        <div class="label">Node Version</div>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px;">
          <select id="nodeVersionSelect" class="settings-input" style="flex: 1;">
            <option value="" disabled ${!state.simplicityApacheNodeVersion ? 'selected' : ''}>Select a version...</option>
            ${versionOptions}
          </select>
          <button id="useNodeVersionBtn">Use Version</button>
        </div>
      </div>
      
      <div class="section">
        <div class="label">Simplicity Apache App Path</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input class="settings-input" id="simplicityPathInput" value="${state.simplicityApachePath ?? ''}" />
          <button id="browseSimplicityPathBtn">${Messages.ui.buttons.browse}</button>
        </div>
        <div class="settings-actions">
          <button id="simplicitySaveBtn">${Messages.ui.buttons.save}</button>
        </div>
      </div>
    `;
  }

  public getStyles(): string {
    return `
      .setup-step {
        display: flex;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 6px;
        background-color: var(--vscode-editor-inactiveSelectionBackground);
        border: 1px solid var(--vscode-editorWidget-border);
      }
      .setup-step.completed {
        border-color: var(--vscode-testing-iconPassed);
        background-color: transparent;
      }
      .setup-step.locked {
        opacity: 0.5;
      }
      .step-status {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 12px;
        background-color: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        font-weight: bold;
        flex-shrink: 0;
      }
      .setup-step.completed .step-status {
        background-color: var(--vscode-testing-iconPassed);
        color: white;
      }
      .step-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .step-content .label {
        margin-bottom: 6px;
        font-size: 13px;
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
  }

  public getScripts(): string {
    return `
      const setupNvmBtn = document.getElementById('setupNvmBtn');
      if (setupNvmBtn) {
        setupNvmBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'setupNvm' });
        });
      }

      const setupBunBtn = document.getElementById('setupBunBtn');
      if (setupBunBtn) {
        setupBunBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'setupBun' });
        });
      }

      const setupNodevmBtn = document.getElementById('setupNodevmBtn');
      if (setupNodevmBtn) {
        setupNodevmBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'setupNodevm' });
        });
      }

      const useNodeVersionBtn = document.getElementById('useNodeVersionBtn');
      const nodeVersionSelect = document.getElementById('nodeVersionSelect');
      if (useNodeVersionBtn && nodeVersionSelect) {
        useNodeVersionBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'useNodeVersion', version: nodeVersionSelect.value });
        });
        nodeVersionSelect.addEventListener('change', () => {
          vscode.postMessage({ type: 'useNodeVersion', version: nodeVersionSelect.value });
        });
      }

      const browseSimplicityPathBtn = document.getElementById('browseSimplicityPathBtn');
      if (browseSimplicityPathBtn) {
        browseSimplicityPathBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'browseSimplicityPath' });
        });
      }

      const simplicitySaveBtn = document.getElementById('simplicitySaveBtn');
      const simplicityPathInput = document.getElementById('simplicityPathInput');
      if (simplicitySaveBtn && simplicityPathInput) {
        simplicitySaveBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'saveSimplicityPath', path: simplicityPathInput.value || '' });
        });
      }
    `;
  }

  public async handleMessage(message: any, config: vscode.WorkspaceConfiguration): Promise<MessageHandlerResult> {
    switch (message.type) {
      case 'setupNvm':
        await handleSetupNvm();
        return { handled: true, shouldRefresh: true, startPolling: true };
      case 'setupBun':
        await handleSetupBun();
        return { handled: true, shouldRefresh: true, startPolling: true };
      case 'setupNodevm':
        await handleSetupNodevm();
        return { handled: true, shouldRefresh: true, startPolling: true };
      case 'useNodeVersion':
        if (message.version) {
          await handleUseNodeVersion(config, message.version);
        }
        return { handled: true, shouldRefresh: true };
      case 'saveSimplicityPath':
        await handleSaveSimplicityPath(config, message.path);
        return { handled: true, shouldRefresh: true };
      case 'browseSimplicityPath':
        await handleBrowseSimplicityPath(config);
        return { handled: true, shouldRefresh: true };
    }
    return { handled: false };
  }
}

