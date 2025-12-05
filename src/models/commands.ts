export type NgxValidationResult =
  | { ok: true; rootPath: string }
  | { ok: false; error: string };

export interface NgxPackageJson {
  name?: string;
  repoOwner?: unknown;
}

export type PackageReadResult =
  | { ok: true; pkg: NgxPackageJson }
  | { ok: false; error: string };

export type PackageValidationResult = { ok: true } | { ok: false; error: string };
