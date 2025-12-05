export const Messages = {
  errors: {
    listBranches: (stderr?: string) =>
      `Ngx Module Linker: Failed to list branches: ${stderr ?? ''}`.trim(),
    checkoutBranch: (branch: string, stderr?: string) =>
      `Ngx Module Linker: Failed to checkout branch ${branch}: ${stderr ?? ''}`.trim(),
  },
  info: {
    switchedBranch: (branch: string) =>
      `Ngx Module Linker: Switched ngx-module to branch ${branch}.`,
    noBranches: 'Ngx Module Linker: No branches found.',
    usingNgxPath: (path: string) => `Ngx Module Linker: Using ngx-module at ${path}`,
  },
  warnings: {
    noWorkspaceRoot: 'Ngx Module Linker: No workspace folder detected.',
    ngxPathNotConfigured: 'Ngx Module Linker: ngx module path not configured.',
  }
} as const;
