import * as path from 'path';

export const REPO_OWNER = '@VFDE-Digital/team-webfactory-write';
export const NGX_DIST_RELATIVE = path.join('distribution', 'ngx-lib');
export const NGX_PACKAGE_NAME = '@vfde-care/ngx-lib';

export const ALLOWED_PROJECT_NAMES: string[] = [
  'net-assistant',
  'onelogin',
  'after-sales',
  'account',
  'form-center',
  'payment',
  'ecare',
  'dsl-onboarding',
  'e-quotation',
  'cable-onboarding',
  'fiber-onboarding',
  'um-onboarding',
  NGX_PACKAGE_NAME
];

export const NVM_CHECK_COMMAND = 'nvm --version';
export const NVM_INSTALL_CURL_COMMAND = 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash';
export const NVM_INSTALL_WGET_COMMAND = 'wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash';

export const NODEVM_CHECK_COMMAND = 'nodevm --version';
export const BUN_CHECK_COMMAND = 'bun --version';

export const DEFAULT_NODE_VERSION = '24.13.0';
export const NODE_VERSIONS_LIST = [
  '24.13.0',
  '22.21.1',
  '20.16.2',
  '18.20.4',
  '18.17.1'
];

export const NODE_VERSION_USE_COMMAND = (executable: 'nodevm' | 'nvm', version: string) => `${executable} use ${version}`;
export const NODE_VERSION_INSTALL_COMMAND = (executable: 'nodevm' | 'nvm', version: string) => `${executable} install ${version}`;
