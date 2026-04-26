import * as vscode from 'vscode';
import { SidebarTab, MessageHandlerResult } from '../../models/tab';
import { PanelState } from '../../models/sidebar';
import { Messages } from '../../messages';
import {
  handleBuildLib,
  handleBuildAndLink,
  handleSwitchBranch,
  handleLink,
  handleOpenNgxWindow,
  handleNpmStart,
  handleNpmInstall
} from '../../commands/index';

export class LinkerTab implements SidebarTab {
  public id = 'linker';
  public title = Messages.ui.tabs.linker;

  public isVisible(state: PanelState): boolean {
    return !!state.ngxPath;
  }

  public getHtml(state: PanelState): string {
    const linkStatus = state.linked ? Messages.status.linkedLabel : Messages.status.notLinkedLabel;
    const currentBranch = state.branch ?? 'Unknown';
    const disableNgxActionsAttr = state.isNgxProject ? 'disabled' : '';
    const ngxWarningHtml = state.isNgxProject
      ? `<div class="section section-xl"><p class="subtitle warning">${Messages.ui.ngxProjectWarning}</p></div>`
      : '';

    return `
      <div class="section">
        <div class="label">${Messages.ui.sections.status}</div>
        <div class="status-row">
          <div class="status-pill ${state.linked ? 'linked' : 'not-linked'}">${linkStatus}</div>
          <button id="refreshBtn" title="Refresh Status">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style="vertical-align: text-bottom; fill: currentColor;">
              <path d="M8 1.5c-1.3 0-2.6.46-3.6 1.3A5 5 0 002.1 7h1.4a3.7 3.7 0 011.1-2.5A3.6 3.6 0 018 3.1c.8 0 1.6.27 2.2.77l-1.4 1.4H13V1.8l-1.4 1.4A5.1 5.1 0 008 1.5zm4.9 7.5h-1.4A3.7 3.7 0 0110.4 12 3.6 3.6 0 018 12.9a3.6 3.6 0 01-2.2-.77l1.4-1.4H3v4.4l1.4-1.4A5.1 5.1 0 008 14.5c1.3 0 2.6-.46 3.6-1.3A5 5 0 0013.9 9z" />
            </svg>
          </button>
        </div>
      </div>
      <div class="section">
        <div class="label">${Messages.ui.sections.currentBranch}</div>
        <div class="value current-branch">${currentBranch}</div>
        <div class="button-row">
          <button id="changeBranchBtn">
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style="vertical-align: text-bottom; margin-right: 4px; fill: currentColor;">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            ${Messages.ui.buttons.changeBranch}
          </button>
        </div>
      </div>
      <div class="section">
        <div class="label">${Messages.ui.sections.development}</div>
        <div class="button-row">
          <div class="split-button-container">
            <button id="npmInstallBtn" class="split-button-main">${Messages.ui.buttons.npmInstall}</button>
            <button id="npmInstallBtnArrow" class="split-button-arrow">
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
              </svg>
            </button>
            <div id="npmInstallDropdown" class="dropdown-menu">
              <button class="dropdown-item" data-action="npmInstall-clean">${Messages.ui.buttons.cleanInstallation}</button>
            </div>
          </div>
          <button id="npmStartBtn">${Messages.ui.buttons.npmStart}</button>
          <button id="openNgxModuleBtn" ${disableNgxActionsAttr}>${Messages.ui.buttons.openNgxModule}</button>
        </div>
      </div>
      <div class="section">
        <div class="label">${Messages.ui.sections.buildLink}</div>
        <div class="button-row">
          <button id="buildLibBtn">${Messages.ui.buttons.buildLib}</button>
          <div class="split-button-container">
            <button id="linkBtn" class="split-button-main" ${disableNgxActionsAttr}>${Messages.ui.buttons.link}</button>
            <button id="linkBtnArrow" class="split-button-arrow" ${disableNgxActionsAttr}>
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
              </svg>
            </button>
            <div id="linkDropdown" class="dropdown-menu">
              <button class="dropdown-item" data-action="link-legacy">${Messages.ui.buttons.useLegacyPeerDeps}</button>
            </div>
          </div>
          <div class="split-button-container">
            <button id="buildAndLinkBtn" class="split-button-main" ${disableNgxActionsAttr}>${Messages.ui.buttons.buildAndLink}</button>
            <button id="buildAndLinkBtnArrow" class="split-button-arrow" ${disableNgxActionsAttr}>
              <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
              </svg>
            </button>
            <div id="buildAndLinkDropdown" class="dropdown-menu">
              <button class="dropdown-item" data-action="buildAndLink-legacy">${Messages.ui.buttons.useLegacyPeerDeps}</button>
            </div>
          </div>
        </div>
        ${ngxWarningHtml}
      </div>
    `;
  }

  public getStyles(): string {
    return `
      .status-pill.linked {
        background-color: var(--vscode-testing-iconPassed);
      }
      .status-pill.not-linked {
        background-color: var(--vscode-testing-iconErrored);
      }
      .status-row {
        display: flex;
        gap: 6px;
        align-items: center;
        justify-content: space-between;
      }
      .status-pill {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        color: var(--vscode-button-foreground);
        margin: 6px 0;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }
      .current-branch {
        padding: 6px 10px;
        border-radius: 5px;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.5;
        background-color: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
        margin: 6px 0;
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }
      .split-button-container {
        position: relative;
        display: flex;
        flex: 1;
      }
      .split-button-main {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
        border-right: none;
        flex: 1;
      }
      .split-button-arrow {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        border-left: 1px solid var(--vscode-menu-background);
        padding: 6px 8px;
        flex: none;
        min-width: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .split-button-arrow svg {
        width: 10px;
        height: 10px;
        fill: currentColor;
      }
      .dropdown-menu {
        position: absolute;
        top: 100%;
        margin-top: 2px;
        background-color: var(--vscode-menu-background);
        border: 1px solid var(--vscode-menu-border);
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 1000;
        min-width: 200px;
        display: none;
      }
      .dropdown-menu.show {
        display: block;
      }
      .dropdown-menu.align-right {
        right: 0;
      }
      .dropdown-menu.align-left {
        left: 0;
      }
      .dropdown-item {
        padding: 8px 12px;
        font-size: 12px;
        cursor: pointer;
        color: var(--vscode-menu-foreground);
        background-color: var(--vscode-menu-background);
        border: none;
        text-align: left;
        width: 100%;
        border-radius: 0;
        flex: none;
      }
      .dropdown-item:hover {
        background-color: var(--vscode-menu-selectionBackground);
        color: var(--vscode-menu-selectionForeground);
        transform: none;
      }
      .dropdown-item:first-child {
        border-top-left-radius: 4px;
        border-top-right-radius: 4px;
      }
      .dropdown-item:last-child {
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
      }
    `;
  }

  public getScripts(): string {
    return `
      if (typeof window.positionDropdown !== 'function') {
        window.positionDropdown = function(container, dropdown) {
          if (!container || !dropdown) {
            return;
          }

          const containerRect = container.getBoundingClientRect();
          const dropdownWidth = 200;
          const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

          dropdown.classList.remove('align-left', 'align-right');

          const spaceOnRight = viewportWidth - containerRect.right;
          const spaceOnLeft = containerRect.left;

          if (spaceOnRight >= dropdownWidth) {
            dropdown.classList.add('align-left');
          } else if (spaceOnLeft >= dropdownWidth) {
            dropdown.classList.add('align-right');
          } else {
            dropdown.classList.add('align-left');
          }
        };
      }

      const buildLibBtn = document.getElementById('buildLibBtn');
      if (buildLibBtn) {
        buildLibBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'buildLib' });
        });
      }

      const linkBtn = document.getElementById('linkBtn');
      if (linkBtn) {
        linkBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'link', useLegacy: false });
        });
      }

      const linkBtnArrow = document.getElementById('linkBtnArrow');
      const linkDropdown = document.getElementById('linkDropdown');
      if (linkBtnArrow && linkDropdown) {
        linkBtnArrow.addEventListener('click', (e) => {
          e.stopPropagation();
          const container = linkBtnArrow.closest('.split-button-container');
        window.positionDropdown(container, linkDropdown);
          linkDropdown.classList.toggle('show');
          document.getElementById('buildAndLinkDropdown')?.classList.remove('show');
          document.getElementById('npmInstallDropdown')?.classList.remove('show');
        });
      }

      const buildAndLinkBtn = document.getElementById('buildAndLinkBtn');
      if (buildAndLinkBtn) {
        buildAndLinkBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'buildAndLink', useLegacy: false });
        });
      }

      const buildAndLinkBtnArrow = document.getElementById('buildAndLinkBtnArrow');
      const buildAndLinkDropdown = document.getElementById('buildAndLinkDropdown');
      if (buildAndLinkBtnArrow && buildAndLinkDropdown) {
        buildAndLinkBtnArrow.addEventListener('click', (e) => {
          e.stopPropagation();
          const container = buildAndLinkBtnArrow.closest('.split-button-container');
        window.positionDropdown(container, buildAndLinkDropdown);
          buildAndLinkDropdown.classList.toggle('show');
          document.getElementById('linkDropdown')?.classList.remove('show');
          document.getElementById('npmInstallDropdown')?.classList.remove('show');
        });
      }

      const npmInstallBtnArrow = document.getElementById('npmInstallBtnArrow');
      const npmInstallDropdown = document.getElementById('npmInstallDropdown');
      if (npmInstallBtnArrow && npmInstallDropdown) {
        npmInstallBtnArrow.addEventListener('click', (e) => {
          e.stopPropagation();
          const container = npmInstallBtnArrow.closest('.split-button-container');
        window.positionDropdown(container, npmInstallDropdown);
          npmInstallDropdown.classList.toggle('show');
          document.getElementById('linkDropdown')?.classList.remove('show');
          document.getElementById('buildAndLinkDropdown')?.classList.remove('show');
        });
      }

      const dropdownItems = document.querySelectorAll('.dropdown-item');
      dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
          const action = item.getAttribute('data-action');
          if (action === 'link-legacy') {
            vscode.postMessage({ type: 'link', useLegacy: true });
          } else if (action === 'buildAndLink-legacy') {
            vscode.postMessage({ type: 'buildAndLink', useLegacy: true });
          } else if (action === 'npmInstall-clean') {
            vscode.postMessage({ type: 'npmInstall', isClean: true });
          }
          linkDropdown?.classList.remove('show');
          buildAndLinkDropdown?.classList.remove('show');
          npmInstallDropdown?.classList.remove('show');
        });
      });

      document.addEventListener('click', () => {
        linkDropdown?.classList.remove('show');
        buildAndLinkDropdown?.classList.remove('show');
        npmInstallDropdown?.classList.remove('show');
      });

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

      const openNgxModuleBtn = document.getElementById('openNgxModuleBtn');
      if (openNgxModuleBtn) {
        openNgxModuleBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'openNgxModule' });
        });
      }

      const npmInstallBtn = document.getElementById('npmInstallBtn');
      if (npmInstallBtn) {
        npmInstallBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'npmInstall', isClean: false });
        });
      }

      const npmStartBtn = document.getElementById('npmStartBtn');
      if (npmStartBtn) {
        npmStartBtn.addEventListener('click', () => {
          vscode.postMessage({ type: 'npmStart' });
        });
      }
    `;
  }

  public async handleMessage(message: any, config: vscode.WorkspaceConfiguration): Promise<MessageHandlerResult> {
    switch (message.type) {
      case 'buildLib':
        await handleBuildLib(config);
        return { handled: true, shouldRefresh: true, startPolling: true };
      case 'link':
        await handleLink(config, message.useLegacy);
        return { handled: true, shouldRefresh: true, startPolling: true };
      case 'buildAndLink':
        await handleBuildAndLink(config, message.useLegacy);
        return { handled: true, shouldRefresh: true, startPolling: true };
      case 'changeBranch':
        await handleSwitchBranch(config);
        return { handled: true, shouldRefresh: true };
      case 'openNgxModule':
        await handleOpenNgxWindow(config);
        return { handled: true, shouldRefresh: true };
      case 'npmInstall':
        await handleNpmInstall(config, message.isClean);
        return { handled: true, shouldRefresh: true };
      case 'npmStart':
        await handleNpmStart(config);
        return { handled: true, shouldRefresh: true, startPolling: true };
    }
    return { handled: false };
  }
}
