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
