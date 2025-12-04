import { exec } from 'child_process';

export function execInDir(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function getCurrentBranch(ngxModulePath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execInDir('git rev-parse --abbrev-ref HEAD', ngxModulePath);
    return stdout.trim();
  } catch {
    return undefined;
  }
}

export async function listBranches(ngxModulePath: string): Promise<string[]> {
  // Ensure we have up-to-date information from all remotes before listing.
  try {
    await execInDir('git fetch --all --prune', ngxModulePath);
  } catch {
    // If fetch fails, still try to list whatever branches we currently know about.
  }

  const { stdout } = await execInDir('git branch -a --format="%(refname:short)"', ngxModulePath);
  return stdout
    .split(/\r?\n/)
    .map(b => b.trim())
    .filter(b => b.length > 0 && b !== 'HEAD');
}

export async function checkoutBranch(ngxModulePath: string, branch: string): Promise<void> {
  // First try to checkout as a local branch.
  try {
    await execInDir(`git rev-parse --verify refs/heads/${branch}`, ngxModulePath);
    await execInDir(`git checkout ${branch}`, ngxModulePath);
    return;
  } catch {
    // Not an existing local branch. Fall through to remote handling.
  }

  // If the selected name looks like a remote (e.g. origin/feature/foo),
  // create/sync a local branch that tracks it, avoiding detached HEAD.
  if (branch.includes('/')) {
    // Strip the remote name (first path segment) but keep the rest, so
    //   origin/feature/wfgt/awdawd   -> feature/wfgt/awdawd
    //   origin/feature/wfgt-awdawd  -> feature/wfgt-awdawd
    //   upstream/feature/foo        -> feature/foo
    const localName = branch.replace(/^[^/]+\//, '');

    // Create or reset the local branch to track the remote ref.
    await execInDir(`git checkout -B ${localName} ${branch}`, ngxModulePath);
    return;
  }

  // Fallback: just checkout whatever was requested.
  await execInDir(`git checkout ${branch}`, ngxModulePath);
}
