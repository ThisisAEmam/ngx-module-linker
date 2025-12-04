import * as fs from 'fs';
import * as path from 'path';
import { NGX_DIST_RELATIVE, NGX_PACKAGE_NAME } from '../constants';

export function isLinked(projectRoot: string, ngxModulePath: string): boolean {
  const nodeModulePath = path.join(projectRoot, 'node_modules', NGX_PACKAGE_NAME);
  if (!fs.existsSync(nodeModulePath)) {
    return false;
  }

  try {
    const stat = fs.lstatSync(nodeModulePath);
    if (!stat.isSymbolicLink()) {
      return false;
    }
    const target = fs.readlinkSync(nodeModulePath);
    const expected = path.join(ngxModulePath, NGX_DIST_RELATIVE);
    return path.resolve(target) === path.resolve(expected);
  } catch {
    return false;
  }
}
