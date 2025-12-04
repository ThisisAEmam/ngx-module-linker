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
  const { stdout } = await execInDir('git branch --format="%(refname:short)"', ngxModulePath);
  return stdout.split(/\r?\n/).map(b => b.trim()).filter(b => b.length > 0);
}

export async function checkoutBranch(ngxModulePath: string, branch: string): Promise<void> {
  await execInDir(`git checkout ${branch}`, ngxModulePath);
}
