export interface PanelState {
  ngxPath?: string;
  branch?: string;
  linked: boolean;
  isNgxProject: boolean;
  os: 'windows' | 'linux' | 'macos';
  isNvmInstalled: boolean;
  isBunInstalled: boolean;
  isNodevmInstalled: boolean;
  simplicityApachePath?: string;
  selectedNodeVersion?: string;}
