# Ngx Module Linker (Internal)

VS Code extension to help link the shared `ngx-module` library into selected Angular apps.

## Features

- Configure the path to the `ngx-module` project once, reused across sessions.
- Status bar item showing current ngx-module Git branch and whether it is linked to the active project.
- Command to switch ngx-module Git branch from a quick pick.
- Command to build ngx-module (`npm run build:lib`).
- Command to build and link ngx-module into the current project.
- Only activates for projects whose `package.json` has `repoOwner = "@VFDE-Digital/team-webfactory-write"` and `name` in `ngxModuleLinker.allowedProjects`.

## Development

1. Run `npm install`.
2. Press `F5` in VS Code to start the Extension Host with this extension.
3. In an eligible Angular project, open the Command Palette and run one of:
   - `Ngx Module: Configure ngx-module Path`
   - `Ngx Module: Switch Branch`
   - `Ngx Module: Build Library`
   - `Ngx Module: Build and Link`
