export const Messages = {
  errors: {
    listBranches: (stderr?: string) =>
      `Ngx Module Linker: Failed to list branches: ${stderr ?? ''}`.trim(),
    checkoutBranch: (branch: string, stderr?: string) =>
      `Ngx Module Linker: Failed to checkout branch ${branch}: ${stderr ?? ''}`.trim(),
    readPackageJsonFailed: 'Failed to read package.json in the detected project root.',
    invalidPackageJson: 'package.json in the detected project root is not valid JSON.',
    packageNameMismatch: (actual: string | undefined, expected: string) =>
      `package.json name is "${actual}", expected "${expected}".`,
    repoOwnerMissing: (expected: string) =>
      `the repoOwner in package.json is missing, expected "${expected}".`,
    repoOwnerMismatch: (actual: string | undefined, expected: string) =>
      `the repoOwner in package.json is "${actual}", expected "${expected}".`,
    pathDoesNotExist: 'Selected path does not exist.',
    packageJsonNotFoundInPath:
      'Could not find a package.json in the selected path or any of its parent folders.'
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
  },
  status: {
    notConfiguredText: '$(git-branch) NGX: Not Configured',
    notConfiguredTooltip: 'Ngx Module Linker: Click to configure ngx module path in settings.',
    mainText: (branchLabel: string, linkedLabel: string) =>
      `$(git-branch) NGX: ${branchLabel} [${linkedLabel}]`,
    mainTooltip: 'Ngx Module Linker | Click to open panel.',
    noGitLabel: 'No Git',
    linkedLabel: 'Linked',
    notLinkedLabel: 'Not Linked'
  },
  progress: {
    fetchingBranchesTitle: 'Ngx Module Linker: Fetching branches…',
  },
  ui: {
    tabs: {
      linker: 'Linker',
      settings: 'Settings'
    },
    buttons: {
      browse: 'Browse',
      cancel: 'Cancel',
      save: 'Save',
      buildLib: 'Build',
      link: 'Link',
      buildAndLink: 'Build & Link',
      openNgxModule: 'Open Window',
      npmInstall: 'Install dependencies',
      npmStart: 'Start NGX',
      changeBranch: 'Change Git branch',
      selectNgxFolder: 'Select Folder',
      useLegacyPeerDeps: 'Use --legacy-peer-deps',
      cleanInstallation: 'Clean installation',
    },
    confirmations: {
      cleanInstallTitle: 'Clean Installation',
      cleanInstallMessage: 'This action will remove "node_modules" directory before installing dependencies. Do you want to continue?',
      cleanInstallConfirm: 'Confirm',
    },
    sections: {
      status: 'Status',
      currentBranch: 'Current branch',
      development: 'Development',
      buildLink: 'Build/Link',
      settings: 'Settings',
      ngxModulePath: 'Ngx module path',
    },
    pathValidationErrorPrefix: (error: string) => `Ngx Module Linker: ${error}`,
    ngxProjectWarning:
      'The currently opened window is the NGX module project. Open Window and Linking actions are disabled.',
    settingsSubtitle:
      'This value is stored in the VS Code setting <code>ngxModuleLinker.ngxModulePath</code>.',
  }
} as const;
