import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlignCenterHorizontal, ArrowDownToLine, ArrowUpFromLine, ChevronDown, CircleHelp, Command as CommandIcon, FilePlus2, FolderOpen, Grid3X3, Hand, Magnet, Map, Menu as MenuIcon, Moon, PanelRightClose, PanelRightOpen, Redo2, Ruler, Save, Scan, Share2, Sparkles, StickyNote, Sun, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { DIAGRAM_LABELS, relationshipKinds, RELATIONSHIP_LABELS } from '../shared/model';
import { deserializeProject, serializeProject } from '../shared/serialization';
import { ContextMenu, contextIcons } from './components/ContextMenu';
import { CommandPalette, type PaletteCommand } from './components/CommandPalette';
import { Sidebar } from './components/Sidebar';
import { Palette } from './components/Palette';
import { Inspector } from './components/Inspector';
import { UmlCanvas, type UmlCanvasHandle } from './components/UmlCanvas';
import { downloadText } from './lib/export';
import { getActiveDiagram, useProjectStore } from './store/useProjectStore';
import { resolveTheme, useWorkspaceStore } from './store/useWorkspaceStore';

type DialogState = { type: 'rename' | 'confirm' | 'notice'; title: string; message?: string; value?: string; confirmLabel?: string; danger?: boolean; onConfirm?: (value?: string) => void };
type MenuItem = { label: string; shortcut?: string; disabled?: boolean; onClick: () => void };

function MenuGroup({ label, icon, open, onOpen, items }: { label: string; icon?: ReactNode; open: boolean; onOpen: () => void; items: MenuItem[] }) {
  return <div className="menu-group"><button className={`menu-trigger ${open ? 'active' : ''}`} onClick={onOpen}>{icon}{label}<ChevronDown size={12} /></button>{open && <div className="menu-popover">{items.map((item) => <button key={item.label} disabled={item.disabled} onClick={item.onClick}><span>{item.label}</span>{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>)}</div>}</div>;
}

function ToolButton({ label, active, shortcut, onClick, children, disabled = false }: { label: string; active?: boolean; shortcut?: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return <button className={`canvas-tool ${active ? 'active' : ''}`} onClick={onClick} disabled={disabled} title={`${label}${shortcut ? ` (${shortcut})` : ''}`} aria-label={label}>{children}<span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>;
}

export function App() {
  const project = useProjectStore((state) => state.project);
  const activeDiagramId = useProjectStore((state) => state.activeDiagramId);
  const selection = useProjectStore((state) => state.selection);
  const dirty = useProjectStore((state) => state.dirty);
  const filePath = useProjectStore((state) => state.filePath);
  const setProject = useProjectStore((state) => state.setProject);
  const newProject = useProjectStore((state) => state.newProject);
  const markClean = useProjectStore((state) => state.markClean);
  const renameProject = useProjectStore((state) => state.renameProject);
  const renameDiagram = useProjectStore((state) => state.renameDiagram);
  const deleteDiagram = useProjectStore((state) => state.deleteDiagram);
  const duplicateDiagram = useProjectStore((state) => state.duplicateDiagram);
  const duplicateSelection = useProjectStore((state) => state.duplicateSelection);
  const addElement = useProjectStore((state) => state.addElement);
  const setSelection = useProjectStore((state) => state.setSelection);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const alignSelection = useProjectStore((state) => state.alignSelection);
  const distributeSelection = useProjectStore((state) => state.distributeSelection);
  const active = getActiveDiagram(project, activeDiagramId);
  const canvasRef = useRef<UmlCanvasHandle>(null);
  const [relationshipKind, setRelationshipKind] = useState(active ? relationshipKinds(active.kind)[0] : 'association');
  const [projectName, setProjectName] = useState(project.name);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => resolveTheme('system'));
  const theme = useWorkspaceStore((state) => state.theme);
  const editorTool = useWorkspaceStore((state) => state.editorTool);
  const dockTab = useWorkspaceStore((state) => state.dockTab);
  const leftRailCollapsed = useWorkspaceStore((state) => state.leftRailCollapsed);
  const rightRailCollapsed = useWorkspaceStore((state) => state.rightRailCollapsed);
  const canvasPreferences = useWorkspaceStore((state) => state.canvas);
  const contextMenu = useWorkspaceStore((state) => state.contextMenu);
  const commandPaletteOpen = useWorkspaceStore((state) => state.commandPaletteOpen);
  const setTheme = useWorkspaceStore((state) => state.setTheme);
  const setEditorTool = useWorkspaceStore((state) => state.setEditorTool);
  const setDockTab = useWorkspaceStore((state) => state.setDockTab);
  const toggleLeftRail = useWorkspaceStore((state) => state.toggleLeftRail);
  const toggleRightRail = useWorkspaceStore((state) => state.toggleRightRail);
  const setCanvasPreference = useWorkspaceStore((state) => state.setCanvasPreference);
  const setCommandPaletteOpen = useWorkspaceStore((state) => state.setCommandPaletteOpen);
  const openContextMenu = useWorkspaceStore((state) => state.openContextMenu);
  const closeContextMenu = useWorkspaceStore((state) => state.closeContextMenu);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => setProjectName(project.name), [project.name]);
  useEffect(() => { if (active) setRelationshipKind((current) => relationshipKinds(active.kind).includes(current) ? current : relationshipKinds(active.kind)[0]); }, [active?.id, active?.kind]);
  useEffect(() => { if (!activeDiagramId && project.diagrams[0]) useProjectStore.getState().setActiveDiagram(project.diagrams[0].id); }, [activeDiagramId, project.diagrams]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  useEffect(() => { setDockTab(selection.nodeIds.length > 0 || selection.edgeIds.length > 0 ? 'inspector' : 'palette'); }, [selection.nodeIds.length, selection.edgeIds.length, setDockTab]);
  useEffect(() => {
    const recovery = async () => {
      const raw = await window.desktop?.loadAutosave();
      if (!raw) return;
      try {
        const recovered = deserializeProject(raw);
        setDialog({ type: 'confirm', title: 'Recover autosaved project?', message: `An autosaved copy of “${recovered.name}” is available.`, confirmLabel: 'Recover', onConfirm: () => setProject(recovered) });
      } catch { /* Ignore an interrupted or incompatible autosave. */ }
    };
    void recovery();
  }, [setProject]);
  useEffect(() => {
    if (!dirty) return;
    const timeout = window.setTimeout(() => { void window.desktop?.saveAutosave(serializeProject(project)); }, 900);
    return () => window.clearTimeout(timeout);
  }, [dirty, project]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); void save(false); }
      if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if (modifier && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
      if (modifier && event.key.toLowerCase() === 'd') { event.preventDefault(); duplicateSelection(); }
      if (modifier && event.key.toLowerCase() === 'n') { event.preventDefault(); requestNew(); }
      if (modifier && event.key.toLowerCase() === 'o') { event.preventDefault(); requestOpen(); }
      if (modifier && event.key.toLowerCase() === 'p') { event.preventDefault(); setCommandPaletteOpen(true); }
      if (modifier && event.shiftKey && event.key === '1') { event.preventDefault(); toggleLeftRail(); }
      if (modifier && event.shiftKey && event.key === '2') { event.preventDefault(); toggleRightRail(); }
      if (!modifier && event.key === '1') setEditorTool('select');
      if (!modifier && event.key === '2') setEditorTool('pan');
      if (!modifier && event.key === '3') setEditorTool('connect');
      if (!modifier && event.key === '4') setEditorTool('note');
      if (!modifier && event.key.toLowerCase() === 'f') canvasRef.current?.fitView();
      if (event.key === 'Escape') { closeContextMenu(); setActiveMenu(null); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
  useEffect(() => { const close = () => { setActiveMenu(null); closeContextMenu(); }; window.addEventListener('mousedown', close); return () => window.removeEventListener('mousedown', close); }, [closeContextMenu]);

  async function save(saveAs: boolean) {
    const content = serializeProject(project);
    if (window.desktop) { const savedPath = await window.desktop.saveProject(content, saveAs ? undefined : filePath); if (savedPath) markClean(savedPath); return; }
    downloadText(`${project.name}.umlproj`, content, 'application/json');
    markClean(filePath);
  }

  async function performOpen() {
    const result = await window.desktop?.openProject();
    if (!result) return;
    try { setProject(deserializeProject(result.content), result.filePath); } catch (error) { setDialog({ type: 'notice', title: 'Could not open project', message: error instanceof Error ? error.message : 'The selected file is not a valid UML Studio project.' }); }
  }
  function requestOpen() { if (dirty) setDialog({ type: 'confirm', title: 'Discard unsaved changes?', message: 'Opening another project will replace the current workspace.', confirmLabel: 'Open project', danger: true, onConfirm: () => { void performOpen(); } }); else void performOpen(); }
  function requestNew() { if (dirty) setDialog({ type: 'confirm', title: 'Start a new project?', message: 'Unsaved changes in the current project will be discarded.', confirmLabel: 'Start new project', danger: true, onConfirm: newProject }); else newProject(); }
  function requestRename(diagramId = active?.id) { const diagram = project.diagrams.find((item) => item.id === diagramId); if (diagram) setDialog({ type: 'rename', title: 'Rename diagram', value: diagram.name, confirmLabel: 'Rename', onConfirm: (value) => renameDiagram(diagram.id, value?.trim() || diagram.name) }); }
  function requestDelete(diagramId = active?.id) { const diagram = project.diagrams.find((item) => item.id === diagramId); if (diagram && project.diagrams.length > 1) setDialog({ type: 'confirm', title: 'Delete diagram?', message: `“${diagram.name}” and its views will be removed from this project.`, confirmLabel: 'Delete diagram', danger: true, onConfirm: () => deleteDiagram(diagram.id) }); }
  function handleContextMenu(event: { clientX: number; clientY: number; stopPropagation: () => void }, type: 'canvas' | 'node' | 'edge' | 'diagram', targetId?: string) {
    event.stopPropagation();
    if (type === 'node' && targetId && !selection.nodeIds.includes(targetId)) setSelection({ nodeIds: [targetId], edgeIds: [] });
    if (type === 'edge' && targetId && !selection.edgeIds.includes(targetId)) setSelection({ nodeIds: [], edgeIds: [targetId] });
    openContextMenu({ x: event.clientX, y: event.clientY, type, targetId });
  }

  const commands: PaletteCommand[] = useMemo(() => [
    { id: 'new', label: 'New project', group: 'File', hint: 'Ctrl+N', run: requestNew }, { id: 'open', label: 'Open project', group: 'File', hint: 'Ctrl+O', run: requestOpen }, { id: 'save', label: 'Save project', group: 'File', hint: 'Ctrl+S', run: () => { void save(false); } },
    { id: 'undo', label: 'Undo', group: 'Edit', hint: 'Ctrl+Z', run: undo }, { id: 'redo', label: 'Redo', group: 'Edit', hint: 'Ctrl+Y', run: redo }, { id: 'class', label: 'Add class', group: 'Add UML element', run: () => addElement('class') }, { id: 'note', label: 'Add note', group: 'Add UML element', run: () => addElement('note') },
    { id: 'fit', label: 'Fit diagram', group: 'View', hint: 'F', run: () => canvasRef.current?.fitView() }, { id: 'grid', label: 'Toggle grid', group: 'View', run: () => setCanvasPreference('gridVisible', !canvasPreferences.gridVisible) }, { id: 'snap', label: 'Toggle snap to grid', group: 'View', run: () => setCanvasPreference('snapToGrid', !canvasPreferences.snapToGrid) }, { id: 'guides', label: 'Toggle guides', group: 'View', run: () => setCanvasPreference('guidesVisible', !canvasPreferences.guidesVisible) },
    { id: 'align-left', label: 'Align left edges', group: 'Arrange', run: () => alignSelection('left') }, { id: 'align-center', label: 'Align horizontal centers', group: 'Arrange', run: () => alignSelection('center') }, { id: 'align-top', label: 'Align top edges', group: 'Arrange', run: () => alignSelection('top') }, { id: 'distribute-x', label: 'Distribute horizontally', group: 'Arrange', run: () => distributeSelection('horizontal') }, { id: 'distribute-y', label: 'Distribute vertically', group: 'Arrange', run: () => distributeSelection('vertical') },
    { id: 'svg', label: 'Export SVG', group: 'Export', run: () => canvasRef.current?.exportSvg() }, { id: 'png', label: 'Export PNG', group: 'Export', run: () => { void canvasRef.current?.exportPng(); } }, { id: 'dark', label: 'Use dark theme', group: 'Appearance', run: () => setTheme('dark') }, { id: 'light', label: 'Use light theme', group: 'Appearance', run: () => setTheme('light') }, { id: 'system', label: 'Use system theme', group: 'Appearance', run: () => setTheme('system') },
  ], [project, dirty, active, canvasPreferences, undo, redo, addElement, setCanvasPreference, alignSelection, distributeSelection, setTheme]);

  function contextItems() {
    if (!contextMenu) return [];
    if (contextMenu.type === 'canvas') return [{ label: 'Add note', icon: contextIcons.add, onClick: () => addElement('note') }, { label: canvasPreferences.gridVisible ? 'Hide grid' : 'Show grid', icon: contextIcons.grid, onClick: () => setCanvasPreference('gridVisible', !canvasPreferences.gridVisible) }, { label: canvasPreferences.snapToGrid ? 'Disable snapping' : 'Enable snapping', icon: contextIcons.snap, onClick: () => setCanvasPreference('snapToGrid', !canvasPreferences.snapToGrid) }, { label: 'Fit diagram', icon: contextIcons.fit, onClick: () => canvasRef.current?.fitView() }];
    if (contextMenu.type === 'node') return [{ label: 'Duplicate selection', icon: contextIcons.duplicate, shortcut: 'Ctrl+D', onClick: () => useProjectStore.getState().duplicateSelection() }, { label: 'Delete selection', icon: contextIcons.delete, shortcut: 'Del', onClick: () => useProjectStore.getState().deleteSelection() }, { label: 'Align left', onClick: () => alignSelection('left'), disabled: selection.nodeIds.length < 2 }];
    if (contextMenu.type === 'edge') return [{ label: 'Delete relationship', icon: contextIcons.delete, onClick: () => useProjectStore.getState().deleteSelection() }];
    if (contextMenu.type === 'diagram' && contextMenu.targetId) return [{ label: 'Duplicate diagram', icon: contextIcons.duplicate, onClick: () => duplicateDiagram(contextMenu.targetId!) }, { label: 'Rename diagram', icon: <FilePlus2 size={14} />, onClick: () => requestRename(contextMenu.targetId) }, { label: 'Delete diagram', icon: contextIcons.delete, onClick: () => requestDelete(contextMenu.targetId), disabled: project.diagrams.length <= 1 }];
    return [];
  }

  return <div className="app-shell" data-theme={resolvedTheme} onMouseDown={() => closeContextMenu()}>
    <header className="topbar"><div className="topbar-title"><div className="brand-mark small">U</div><span>UML Studio</span><span className="topbar-divider" /><span className="project-title">{project.name}{dirty && <span className="dirty-dot" title="Unsaved changes" />}</span></div><div className="menu-strip"><MenuGroup label="File" open={activeMenu === 'file'} onOpen={() => setActiveMenu(activeMenu === 'file' ? null : 'file')} items={[{ label: 'New project', shortcut: 'Ctrl+N', onClick: requestNew }, { label: 'Open project', shortcut: 'Ctrl+O', onClick: requestOpen }, { label: 'Save', shortcut: 'Ctrl+S', onClick: () => { void save(false); } }, { label: 'Save As…', onClick: () => { void save(true); } }]} /><MenuGroup label="Edit" open={activeMenu === 'edit'} onOpen={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')} items={[{ label: 'Undo', shortcut: 'Ctrl+Z', onClick: undo }, { label: 'Redo', shortcut: 'Ctrl+Y', onClick: redo }, { label: 'Duplicate selection', shortcut: 'Ctrl+D', onClick: () => useProjectStore.getState().duplicateSelection() }]} /><MenuGroup label="View" open={activeMenu === 'view'} onOpen={() => setActiveMenu(activeMenu === 'view' ? null : 'view')} items={[{ label: 'Command palette', shortcut: 'Ctrl+P', onClick: () => setCommandPaletteOpen(true) }, { label: canvasPreferences.gridVisible ? 'Hide grid' : 'Show grid', onClick: () => setCanvasPreference('gridVisible', !canvasPreferences.gridVisible) }, { label: 'Toggle navigator', shortcut: 'Ctrl+Shift+1', onClick: toggleLeftRail }, { label: 'Toggle right dock', shortcut: 'Ctrl+Shift+2', onClick: toggleRightRail }]} /><MenuGroup label="Diagram" open={activeMenu === 'diagram'} onOpen={() => setActiveMenu(activeMenu === 'diagram' ? null : 'diagram')} items={[{ label: 'Add class', onClick: () => addElement('class') }, { label: 'Add note', onClick: () => addElement('note') }, { label: 'Fit diagram', shortcut: 'F', onClick: () => canvasRef.current?.fitView() }, { label: 'Export SVG', onClick: () => canvasRef.current?.exportSvg() }]} /><MenuGroup label="Help" icon={<CircleHelp size={13} />} open={activeMenu === 'help'} onOpen={() => setActiveMenu(activeMenu === 'help' ? null : 'help')} items={[{ label: 'Keyboard shortcuts', onClick: () => setCommandPaletteOpen(true) }, { label: 'About UML Studio', onClick: () => setDialog({ type: 'notice', title: 'About UML Studio', message: 'A local-first UML modeling workspace. Your project files stay on this device.' }) }]} /></div><div className="topbar-actions"><button className="toolbar-button" onClick={requestNew}><FilePlus2 size={15} /> New</button><button className="toolbar-button" onClick={requestOpen}><FolderOpen size={15} /> Open</button><button className="toolbar-button primary" onClick={() => { void save(false); }}><Save size={15} /> Save</button><button className="icon-button" title="Save As" aria-label="Save As" onClick={() => { void save(true); }}><ArrowUpFromLine size={15} /></button><span className="topbar-divider" /><button className="icon-button" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={undo}><Undo2 size={16} /></button><button className="icon-button" title="Redo (Ctrl+Y)" aria-label="Redo" onClick={redo}><Redo2 size={16} /></button></div><div className="topbar-right"><button className="theme-button" onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')} title={`Theme: ${theme}`} aria-label={`Theme: ${theme}`}>{theme === 'dark' ? <Moon size={14} /> : theme === 'light' ? <Sun size={14} /> : <Sparkles size={14} />}<span>{theme === 'system' ? 'System' : theme[0].toUpperCase() + theme.slice(1)}</span></button><button className="command-button" onClick={() => setCommandPaletteOpen(true)} title="Command palette (Ctrl+P)" aria-label="Open command palette"><CommandIcon size={14} /><kbd>Ctrl P</kbd></button></div></header>
    <div className={`workspace ${leftRailCollapsed ? 'left-collapsed' : ''} ${rightRailCollapsed ? 'right-collapsed' : ''}`}><Sidebar collapsed={leftRailCollapsed} onToggle={toggleLeftRail} onRename={requestRename} onDelete={requestDelete} onDiagramMenu={(event, diagramId) => handleContextMenu(event, 'diagram', diagramId)} /><main className="main-stage"><div className="stage-toolbar"><div className="breadcrumb"><span>Project</span><span>/</span><strong>{active ? active.name : 'No diagram'}</strong><span className="diagram-badge">{active && DIAGRAM_LABELS[active.kind]}</span></div><div className="stage-tools"><label className="relationship-picker"><span>Connect as</span><select value={relationshipKind} onChange={(event) => setRelationshipKind(event.target.value as typeof relationshipKind)}>{active && relationshipKinds(active.kind).map((kind) => <option value={kind} key={kind}>{RELATIONSHIP_LABELS[kind]}</option>)}</select></label><button className="export-button" onClick={() => canvasRef.current?.exportSvg()} title="Export SVG"><ArrowDownToLine size={14} /> SVG</button><button className="export-button" onClick={() => void canvasRef.current?.exportPng()} title="Export PNG">PNG</button></div></div><div className="project-name-strip"><input value={projectName} onChange={(event) => setProjectName(event.target.value)} onBlur={() => projectName !== project.name && renameProject(projectName)} aria-label="Project name" /><span>Local project file · autosave enabled</span><span className="file-path">{filePath ?? 'Not saved to disk'}</span></div><div className="canvas-toolbar"><div className="tool-group"><ToolButton label="Select" shortcut="1" active={editorTool === 'select'} onClick={() => setEditorTool('select')}><MenuIcon size={15} /></ToolButton><ToolButton label="Pan" shortcut="2" active={editorTool === 'pan'} onClick={() => setEditorTool('pan')}><Hand size={15} /></ToolButton><ToolButton label="Connect" shortcut="3" active={editorTool === 'connect'} onClick={() => setEditorTool('connect')}><Share2 size={15} /></ToolButton><ToolButton label="Note" shortcut="4" active={editorTool === 'note'} onClick={() => setEditorTool('note')}><StickyNote size={15} /></ToolButton></div><div className="toolbar-separator" /><div className="tool-group"><button className="icon-button" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={undo}><Undo2 size={15} /></button><button className="icon-button" title="Redo (Ctrl+Y)" aria-label="Redo" onClick={redo}><Redo2 size={15} /></button><button className="icon-button" title="Align centers" aria-label="Align centers" disabled={selection.nodeIds.length < 2} onClick={() => alignSelection('center')}><AlignCenterHorizontal size={15} /></button><button className="icon-button" title="Distribute horizontally" aria-label="Distribute horizontally" disabled={selection.nodeIds.length < 3} onClick={() => distributeSelection('horizontal')}><AlignCenterHorizontal size={15} /></button></div><div className="toolbar-separator" /><div className="tool-group canvas-toggles"><button className={`toggle-button ${canvasPreferences.gridVisible ? 'on' : ''}`} onClick={() => setCanvasPreference('gridVisible', !canvasPreferences.gridVisible)} title="Toggle grid" aria-label="Toggle grid"><Grid3X3 size={14} /></button><button className={`toggle-button ${canvasPreferences.snapToGrid ? 'on' : ''}`} onClick={() => setCanvasPreference('snapToGrid', !canvasPreferences.snapToGrid)} title="Toggle snapping" aria-label="Toggle snapping"><Magnet size={14} /></button><button className={`toggle-button ${canvasPreferences.guidesVisible ? 'on' : ''}`} onClick={() => setCanvasPreference('guidesVisible', !canvasPreferences.guidesVisible)} title="Toggle guides" aria-label="Toggle guides"><Ruler size={14} /></button><button className={`toggle-button ${canvasPreferences.minimapVisible ? 'on' : ''}`} onClick={() => setCanvasPreference('minimapVisible', !canvasPreferences.minimapVisible)} title="Toggle minimap" aria-label="Toggle minimap"><Map size={14} /></button></div><div className="toolbar-spacer" /><div className="tool-group"><button className="icon-button" title="Zoom out" aria-label="Zoom out" onClick={() => canvasRef.current?.zoomOut()}><ZoomOut size={15} /></button><button className="icon-button" title="Fit diagram" aria-label="Fit diagram" onClick={() => canvasRef.current?.fitView()}><Scan size={15} /></button><button className="icon-button" title="Zoom in" aria-label="Zoom in" onClick={() => canvasRef.current?.zoomIn()}><ZoomIn size={15} /></button><button className="icon-button" title={rightRailCollapsed ? 'Show right dock (Ctrl+Shift+2)' : 'Hide right dock (Ctrl+Shift+2)'} aria-label="Toggle right dock" onClick={toggleRightRail}><PanelRightOpen size={15} /></button></div></div>{active && <UmlCanvas ref={canvasRef} relationshipKind={relationshipKind} editorTool={editorTool} canvasPreferences={canvasPreferences} onContextMenu={handleContextMenu} onNotice={(message) => setDialog({ type: 'notice', title: 'Relationship unavailable', message })} />}</main><aside className={`right-rail ${rightRailCollapsed ? 'collapsed' : ''}`}>{rightRailCollapsed ? <button className="collapsed-rail-button" onClick={toggleRightRail} title="Show palette and inspector" aria-label="Show palette and inspector"><PanelRightOpen size={17} /></button> : <><div className="dock-tabs"><button className={dockTab === 'palette' ? 'active' : ''} onClick={() => setDockTab('palette')}><Grid3X3 size={14} /> Palette</button><button className={dockTab === 'inspector' ? 'active' : ''} onClick={() => setDockTab('inspector')}><MenuIcon size={14} /> Inspector</button><button className="icon-button" onClick={toggleRightRail} title="Collapse right dock" aria-label="Collapse right dock"><PanelRightClose size={15} /></button></div>{active && dockTab === 'palette' && <Palette diagramKind={active.kind} />}{dockTab === 'inspector' && <Inspector />}</>}</aside></div>
    <footer className="statusbar"><span><span className="status-dot" /> Ready</span><span>{project.diagrams.length} diagrams · {Object.keys(project.model.elements).length} model elements</span><span className="status-spacer" /><span>{canvasPreferences.gridVisible ? 'Grid' : 'Grid off'} · {canvasPreferences.snapToGrid ? 'Snap on' : 'Free move'} · {resolvedTheme} theme</span><span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span></footer>
    {commandPaletteOpen && <CommandPalette commands={commands} onClose={() => setCommandPaletteOpen(false)} />}{contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextItems()} onClose={closeContextMenu} />}{dialog && <Dialog state={dialog} onChange={(value) => setDialog((current) => current ? { ...current, value } : current)} onClose={() => setDialog(null)} />}
  </div>;
}

function Dialog({ state, onChange, onClose }: { state: DialogState; onChange: (value: string) => void; onClose: () => void }) {
  const submit = () => { state.onConfirm?.(state.type === 'rename' ? state.value : undefined); onClose(); };
  return <div className="modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-icon"><Sparkles size={17} /></div><div className="dialog-copy"><h2 id="dialog-title">{state.title}</h2>{state.message && <p>{state.message}</p>}{state.type === 'rename' && <input autoFocus value={state.value ?? ''} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} aria-label="New name" />}</div><div className="dialog-actions"><button className="subtle-button" onClick={onClose}>Cancel</button>{state.type !== 'notice' && <button className={`toolbar-button ${state.danger ? 'danger-fill' : 'primary'}`} onClick={submit}>{state.confirmLabel ?? 'Confirm'}</button>}{state.type === 'notice' && <button className="toolbar-button primary" onClick={onClose}>OK</button>}</div></section></div>;
}
