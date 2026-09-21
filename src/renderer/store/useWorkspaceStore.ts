import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';
export type EditorTool = 'select' | 'pan' | 'connect' | 'note';
export type DockTab = 'palette' | 'inspector';
export type LeftRailTab = 'diagrams' | 'model' | 'toolbox';
export type RightRailTab = 'model' | 'properties' | 'style' | 'documentation';

export type CanvasPreferences = {
  gridVisible: boolean;
  snapToGrid: boolean;
  guidesVisible: boolean;
  minimapVisible: boolean;
  gridSize: number;
};

export type WorkspacePreferences = {
  theme: ThemeMode;
  editorTool: EditorTool;
  leftRailTab: LeftRailTab;
  rightRailTab: RightRailTab;
  leftRailCollapsed: boolean;
  rightRailCollapsed: boolean;
  bottomPanelCollapsed: boolean;
  canvas: CanvasPreferences;
};

export type ContextMenuState = {
  x: number;
  y: number;
  type: 'canvas' | 'node' | 'edge' | 'diagram';
  targetId?: string;
};

const STORAGE_KEY = 'uml-studio.workspace-preferences.v1';

export const defaultWorkspacePreferences: WorkspacePreferences = {
  theme: 'dark',
  editorTool: 'select',
  leftRailTab: 'diagrams',
  rightRailTab: 'model',
  leftRailCollapsed: false,
  rightRailCollapsed: false,
  bottomPanelCollapsed: false,
  canvas: {
    gridVisible: true,
    snapToGrid: true,
    guidesVisible: false,
    minimapVisible: true,
    gridSize: 24,
  },
};

function readPreferences(): WorkspacePreferences {
  if (typeof window === 'undefined') return defaultWorkspacePreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWorkspacePreferences;
    const parsed = JSON.parse(raw) as Partial<WorkspacePreferences> & { dockTab?: DockTab };
    const leftRailTab = parsed.leftRailTab ?? (parsed.dockTab === 'palette' ? 'toolbox' : defaultWorkspacePreferences.leftRailTab);
    const rightRailTab = parsed.rightRailTab ?? (parsed.dockTab === 'inspector' ? 'properties' : defaultWorkspacePreferences.rightRailTab);
    return {
      ...defaultWorkspacePreferences,
      ...parsed,
      leftRailTab,
      rightRailTab,
      canvas: { ...defaultWorkspacePreferences.canvas, ...parsed.canvas },
    };
  } catch {
    return defaultWorkspacePreferences;
  }
}

function persistPreferences(preferences: WorkspacePreferences) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* private mode can disable storage */ }
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') return mode;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

type WorkspaceStore = WorkspacePreferences & {
  commandPaletteOpen: boolean;
  contextMenu: ContextMenuState | null;
  setTheme: (theme: ThemeMode) => void;
  setEditorTool: (editorTool: EditorTool) => void;
  setLeftRailTab: (leftRailTab: LeftRailTab) => void;
  setRightRailTab: (rightRailTab: RightRailTab) => void;
  setDockTab: (dockTab: DockTab) => void;
  toggleLeftRail: () => void;
  toggleRightRail: () => void;
  toggleBottomPanel: () => void;
  setCanvasPreference: <K extends keyof CanvasPreferences>(key: K, value: CanvasPreferences[K]) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openContextMenu: (contextMenu: ContextMenuState) => void;
  closeContextMenu: () => void;
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  ...readPreferences(),
  commandPaletteOpen: false,
  contextMenu: null,
  setTheme: (theme) => set((state) => { const next = { ...state, theme }; persistPreferences(next); return { theme }; }),
  setEditorTool: (editorTool) => set((state) => { const next = { ...state, editorTool }; persistPreferences(next); return { editorTool }; }),
  setLeftRailTab: (leftRailTab) => set((state) => { const next = { ...state, leftRailTab }; persistPreferences(next); return { leftRailTab }; }),
  setRightRailTab: (rightRailTab) => set((state) => { const next = { ...state, rightRailTab }; persistPreferences(next); return { rightRailTab }; }),
  setDockTab: (dockTab) => set((state) => {
    const next = dockTab === 'palette' ? { leftRailTab: 'toolbox' as const } : { rightRailTab: 'properties' as const };
    persistPreferences({ ...state, ...next });
    return next;
  }),
  toggleLeftRail: () => set((state) => { const leftRailCollapsed = !state.leftRailCollapsed; persistPreferences({ ...state, leftRailCollapsed }); return { leftRailCollapsed }; }),
  toggleRightRail: () => set((state) => { const rightRailCollapsed = !state.rightRailCollapsed; persistPreferences({ ...state, rightRailCollapsed }); return { rightRailCollapsed }; }),
  toggleBottomPanel: () => set((state) => { const bottomPanelCollapsed = !state.bottomPanelCollapsed; persistPreferences({ ...state, bottomPanelCollapsed }); return { bottomPanelCollapsed }; }),
  setCanvasPreference: (key, value) => set((state) => {
    const canvas = { ...state.canvas, [key]: value };
    persistPreferences({ ...state, canvas });
    return { canvas };
  }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  openContextMenu: (contextMenu) => set({ contextMenu }),
  closeContextMenu: () => set({ contextMenu: null }),
}));

export function resetWorkspacePreferences() {
  persistPreferences(defaultWorkspacePreferences);
  useWorkspaceStore.setState(defaultWorkspacePreferences);
}
