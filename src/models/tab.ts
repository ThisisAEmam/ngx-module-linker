import * as vscode from 'vscode';
import { PanelState } from './sidebar';

export interface MessageHandlerResult {
  handled: boolean;
  shouldRefresh?: boolean;
  startPolling?: boolean;
}

export interface SidebarTab {
  id: string;
  title: string;
  isVisible(state: PanelState): boolean;
  getHtml(state: PanelState): string;
  getStyles?(): string;
  getScripts?(nonce: string): string;
  handleMessage?(message: any, config: vscode.WorkspaceConfiguration, webview: vscode.Webview): Promise<MessageHandlerResult>;
}
