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
    // npm link usually creates a symlink into the global node_modules, which
    // in turn may point to the actual dist folder. Resolve the real path so we
    // follow the entire symlink chain and compare against the expected dist.
    const realTarget = fs.realpathSync(nodeModulePath);
    const expected = path.resolve(path.join(ngxModulePath, NGX_DIST_RELATIVE));
    return path.resolve(realTarget) === expected;
  } catch {
    return false;
  }
}
