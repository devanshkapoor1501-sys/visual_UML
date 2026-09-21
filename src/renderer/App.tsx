import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { FileText, PanelRightOpen, Sparkles } from 'lucide-react';
import { DIAGRAM_LABELS, relationshipKinds, type RelationshipKind } from '../shared/model';
import { deserializeProject, serializeProject } from '../shared/serialization';
import { CommandPalette, type PaletteCommand } from './components/CommandPalette';
import { ContextMenu, contextIcons } from './components/ContextMenu';
import { CanvasToolbar } from './components/CanvasToolbar';
import { DiagramStrip } from './components/DiagramStrip';
import { InspectorRail } from './components/InspectorRail';
import { NavigatorRail } from './components/NavigatorRail';
import { TopMenuBar } from './components/TopMenuBar';
import { UmlCanvas, type UmlCanvasHandle } from './components/UmlCanvas';
import { downloadText } from './lib/export';
import { getActiveDiagram, useProjectStore } from './store/useProjectStore';
import { resolveTheme, useWorkspaceStore } from './store/useWorkspaceStore';

type DialogState = { type: 'rename' | 'confirm' | 'notice'; title: string; message?: string; value?: string; confirmLabel?: string; danger?: boolean; onConfirm?: (value?: string) => void };

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
  const deleteSelection = useProjectStore((state) => state.deleteSelection);
  const setSelection = useProjectStore((state) => state.setSelection);
  const setActiveDiagram = useProjectStore((state) => state.setActiveDiagram);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const alignSelection = useProjectStore((state) => state.alignSelection);
  const distributeSelection = useProjectStore((state) => state.distributeSelection);
  const active = getActiveDiagram(project, activeDiagramId);
  const canvasRef = useRef<UmlCanvasHandle>(null);
  const [relationshipKind, setRelationshipKind] = useState<RelationshipKind>(active ? relationshipKinds(active.kind)[0] : 'association');
  const [projectName, setProjectName] = useState(project.name);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => resolveTheme('system'));
  const [focusedModelId, setFocusedModelId] = useState<string | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const theme = useWorkspaceStore((state) => state.theme);
  const editorTool = useWorkspaceStore((state) => state.editorTool);
  const leftRailTab = useWorkspaceStore((state) => state.leftRailTab);
  const rightRailTab = useWorkspaceStore((state) => state.rightRailTab);
  const leftRailCollapsed = useWorkspaceStore((state) => state.leftRailCollapsed);
  const rightRailCollapsed = useWorkspaceStore((state) => state.rightRailCollapsed);
  const bottomPanelCollapsed = useWorkspaceStore((state) => state.bottomPanelCollapsed);
  const canvasPreferences = useWorkspaceStore((state) => state.canvas);
  const contextMenu = useWorkspaceStore((state) => state.contextMenu);
  const commandPaletteOpen = useWorkspaceStore((state) => state.commandPaletteOpen);
  const setTheme = useWorkspaceStore((state) => state.setTheme);
  const setEditorTool = useWorkspaceStore((state) => state.setEditorTool);
  const setLeftRailTab = useWorkspaceStore((state) => state.setLeftRailTab);
  const setRightRailTab = useWorkspaceStore((state) => state.setRightRailTab);
  const toggleLeftRail = useWorkspaceStore((state) => state.toggleLeftRail);
  const toggleRightRail = useWorkspaceStore((state) => state.toggleRightRail);
  const toggleBottomPanel = useWorkspaceStore((state) => state.toggleBottomPanel);
  const setCanvasPreference = useWorkspaceStore((state) => state.setCanvasPreference);
  const setCommandPaletteOpen = useWorkspaceStore((state) => state.setCommandPaletteOpen);
  const openContextMenu = useWorkspaceStore((state) => state.openContextMenu);
  const closeContextMenu = useWorkspaceStore((state) => state.closeContextMenu);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => setProjectName(project.name), [project.name]);
  useEffect(() => { if (active) setRelationshipKind((current) => relationshipKinds(active.kind).includes(current) ? current : relationshipKinds(active.kind)[0]); }, [active?.id, active?.kind]);
  useEffect(() => { if (!activeDiagramId && project.diagrams[0]) setActiveDiagram(project.diagrams[0].id); }, [activeDiagramId, project.diagrams, setActiveDiagram]);
  useEffect(() => { if (selection.nodeIds.length || selection.edgeIds.length) setFocusedModelId(null); }, [selection.nodeIds.length, selection.edgeIds.length]);
  useEffect(() => { setRightRailTab(selection.nodeIds.length || selection.edgeIds.length ? 'properties' : 'model'); }, [selection.nodeIds.length, selection.edgeIds.length, setRightRailTab]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const update = () => setSystemTheme(media.matches ? 'dark' : 'light');
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  useEffect(() => {
    const recovery = async () => {
      const raw = await window.desktop?.loadAutosave();
      if (!raw) return;
      try { const recovered = deserializeProject(raw); setDialog({ type: 'confirm', title: 'Recover autosaved project?', message: `An autosaved copy of “${recovered.name}” is available.`, confirmLabel: 'Recover', onConfirm: () => setProject(recovered) }); } catch { /* Ignore interrupted or incompatible autosaves. */ }
    };
    void recovery();
  }, [setProject]);
  useEffect(() => { if (!dirty) return; const timeout = window.setTimeout(() => { void window.desktop?.saveAutosave(serializeProject(project)); }, 900); return () => window.clearTimeout(timeout); }, [dirty, project]);
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
  function handleDiagramMenu(event: MouseEvent, diagramId: string) { event.preventDefault(); handleContextMenu(event, 'diagram', diagramId); }
  function focusModelElement(elementId: string) {
    const owner = project.diagrams.find((diagram) => diagram.views.some((view) => view.elementId === elementId));
    setFocusedModelId(owner ? null : elementId);
    const view = owner?.views.find((item) => item.elementId === elementId);
    const selectView = () => setSelection(view ? { nodeIds: [elementId], edgeIds: [] } : { nodeIds: [], edgeIds: [] });
    setFocusNodeId(view ? elementId : null);
    if (owner && owner.id !== activeDiagramId) { setActiveDiagram(owner.id); window.setTimeout(selectView, 0); } else selectView();
    if (view) window.setTimeout(() => setFocusNodeId(null), 240);
    setRightRailTab('properties');
  }
  function cycleTheme() { setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'); }

  const commands: PaletteCommand[] = useMemo(() => [
    { id: 'new', label: 'New project', group: 'File', hint: 'Ctrl+N', run: requestNew }, { id: 'open', label: 'Open project', group: 'File', hint: 'Ctrl+O', run: requestOpen }, { id: 'save', label: 'Save project', group: 'File', hint: 'Ctrl+S', run: () => { void save(false); } },
    { id: 'undo', label: 'Undo', group: 'Edit', hint: 'Ctrl+Z', run: undo }, { id: 'redo', label: 'Redo', group: 'Edit', hint: 'Ctrl+Y', run: redo }, { id: 'duplicate', label: 'Duplicate selection', group: 'Edit', hint: 'Ctrl+D', run: duplicateSelection },
    { id: 'class', label: 'Add class', group: 'Add UML element', run: () => useProjectStore.getState().addElement('class') }, { id: 'note', label: 'Add note', group: 'Add UML element', run: () => useProjectStore.getState().addElement('note') },
    { id: 'fit', label: 'Fit diagram', group: 'View', hint: 'F', run: () => canvasRef.current?.fitView() }, { id: 'grid', label: 'Toggle grid', group: 'View', run: () => setCanvasPreference('gridVisible', !canvasPreferences.gridVisible) }, { id: 'snap', label: 'Toggle snap to grid', group: 'View', run: () => setCanvasPreference('snapToGrid', !canvasPreferences.snapToGrid) }, { id: 'guides', label: 'Toggle guides', group: 'View', run: () => setCanvasPreference('guidesVisible', !canvasPreferences.guidesVisible) },
    { id: 'align', label: 'Align centers', group: 'Arrange', run: () => alignSelection('center') }, { id: 'distribute', label: 'Distribute horizontally', group: 'Arrange', run: () => distributeSelection('horizontal') },
    { id: 'svg', label: 'Export SVG', group: 'Export', run: () => canvasRef.current?.exportSvg() }, { id: 'png', label: 'Export PNG', group: 'Export', run: () => { void canvasRef.current?.exportPng(); } },
    { id: 'dark', label: 'Use dark theme', group: 'Appearance', run: () => setTheme('dark') }, { id: 'light', label: 'Use light theme', group: 'Appearance', run: () => setTheme('light') }, { id: 'system', label: 'Use system theme', group: 'Appearance', run: () => setTheme('system') },
  ], [project, dirty, active, canvasPreferences, theme, undo, redo, duplicateSelection, setCanvasPreference, alignSelection, distributeSelection, setTheme]);

  function contextItems() {
    if (!contextMenu) return [];
    if (contextMenu.type === 'canvas') return [{ label: 'Add note', icon: contextIcons.add, onClick: () => useProjectStore.getState().addElement('note') }, { label: canvasPreferences.gridVisible ? 'Hide grid' : 'Show grid', icon: contextIcons.grid, onClick: () => setCanvasPreference('gridVisible', !canvasPreferences.gridVisible) }, { label: canvasPreferences.snapToGrid ? 'Disable snapping' : 'Enable snapping', icon: contextIcons.snap, onClick: () => setCanvasPreference('snapToGrid', !canvasPreferences.snapToGrid) }, { label: 'Fit diagram', icon: contextIcons.fit, onClick: () => canvasRef.current?.fitView() }];
    if (contextMenu.type === 'node') return [{ label: 'Duplicate selection', icon: contextIcons.duplicate, shortcut: 'Ctrl+D', onClick: duplicateSelection }, { label: 'Delete selection', icon: contextIcons.delete, shortcut: 'Del', onClick: deleteSelection }, { label: 'Align left', onClick: () => alignSelection('left'), disabled: selection.nodeIds.length < 2 }];
    if (contextMenu.type === 'edge') return [{ label: 'Delete relationship', icon: contextIcons.delete, onClick: deleteSelection }];
    if (contextMenu.type === 'diagram' && contextMenu.targetId) return [{ label: 'Duplicate diagram', icon: contextIcons.duplicate, onClick: () => duplicateDiagram(contextMenu.targetId!) }, { label: 'Rename diagram', icon: <FileText size={14} />, onClick: () => requestRename(contextMenu.targetId) }, { label: 'Delete diagram', icon: contextIcons.delete, onClick: () => requestDelete(contextMenu.targetId), disabled: project.diagrams.length <= 1 }];
    return [];
  }

  return <div className="app-shell redesign-shell" data-theme={resolvedTheme} onMouseDown={() => closeContextMenu()}>
    <TopMenuBar projectName={project.name} dirty={dirty} theme={theme} activeMenu={activeMenu} onMenu={setActiveMenu} onNew={requestNew} onOpen={requestOpen} onSave={() => { void save(false); }} onSaveAs={() => { void save(true); }} onUndo={undo} onRedo={redo} onDuplicate={duplicateSelection} onCommandPalette={() => setCommandPaletteOpen(true)} onToggleGrid={() => setCanvasPreference('gridVisible', !canvasPreferences.gridVisible)} onToggleNavigator={toggleLeftRail} onToggleInspector={toggleRightRail} onFit={() => canvasRef.current?.fitView()} onAlign={() => alignSelection('center')} onExportSvg={() => canvasRef.current?.exportSvg()} onAbout={() => setDialog({ type: 'notice', title: 'About UML Studio', message: 'A local-first UML modeling workspace. Your project files stay on this device.' })} onTheme={cycleTheme} />
    <div className={`workspace redesign-workspace ${leftRailCollapsed ? 'left-collapsed' : ''} ${rightRailCollapsed ? 'right-collapsed' : ''}`}>
      <NavigatorRail project={project} activeDiagramId={activeDiagramId} tab={leftRailTab} collapsed={leftRailCollapsed} onTabChange={setLeftRailTab} onToggle={toggleLeftRail} onRename={requestRename} onDelete={requestDelete} onDiagramMenu={handleDiagramMenu} onModelSelect={focusModelElement} />
      <main className="main-stage redesign-stage">
        <div className="stage-header"><div className="stage-breadcrumb"><span className="muted">Project</span><span>/</span><strong>{active?.name ?? 'No diagram'}</strong><span className="diagram-badge">{active ? DIAGRAM_LABELS[active.kind] : 'Empty'}</span></div><div className="stage-header-actions"><input value={projectName} onChange={(event) => setProjectName(event.target.value)} onBlur={() => projectName !== project.name && renameProject(projectName)} aria-label="Project name" /><span className="file-state">{filePath ? 'Saved locally' : 'Not saved to disk'}</span><button className="export-button" onClick={() => canvasRef.current?.exportSvg()} title="Export SVG">SVG</button><button className="export-button" onClick={() => void canvasRef.current?.exportPng()} title="Export PNG">PNG</button><button className="icon-button" onClick={toggleRightRail} title={rightRailCollapsed ? 'Show inspector' : 'Hide inspector'} aria-label="Toggle inspector"><PanelRightOpen size={15} /></button></div></div>
        {active && <CanvasToolbar diagramKind={active.kind} relationshipKind={relationshipKind} onRelationshipKindChange={setRelationshipKind} editorTool={editorTool} onEditorToolChange={setEditorTool} preferences={canvasPreferences} onPreferenceChange={setCanvasPreference} selectionCount={selection.nodeIds.length} onUndo={undo} onRedo={redo} onAlign={alignSelection} onDistribute={distributeSelection} onFit={() => canvasRef.current?.fitView()} onZoomIn={() => canvasRef.current?.zoomIn()} onZoomOut={() => canvasRef.current?.zoomOut()} />}
        <div className="canvas-stage">{active ? <UmlCanvas ref={canvasRef} relationshipKind={relationshipKind} editorTool={editorTool} canvasPreferences={canvasPreferences} focusNodeId={focusNodeId} onContextMenu={handleContextMenu} onNotice={(message) => setDialog({ type: 'notice', title: 'Relationship unavailable', message })} /> : <div className="canvas-empty">Create a diagram to begin modeling.</div>}</div>
        <DiagramStrip diagrams={project.diagrams} activeDiagramId={activeDiagramId} collapsed={bottomPanelCollapsed} onToggle={toggleBottomPanel} onDiagramMenu={handleDiagramMenu} />
      </main>
      {!rightRailCollapsed && <InspectorRail project={project} activeDiagramId={activeDiagramId} selection={selection} tab={rightRailTab} focusedModelId={focusedModelId} onTabChange={setRightRailTab} onDelete={deleteSelection} onModelSelect={focusModelElement} />}
      {rightRailCollapsed && <aside className="inspector-rail collapsed"><button className="collapsed-inspector-button" onClick={toggleRightRail} title="Show inspector" aria-label="Show inspector"><PanelRightOpen size={17} /></button></aside>}
    </div>
    <footer className="statusbar redesign-statusbar"><span><span className="status-dot" /> Ready</span><span>{project.diagrams.length} diagrams · {Object.keys(project.model.elements).length} elements</span><span>{active?.relationships.length ?? 0} relationships</span><span className="status-spacer" /><span>{canvasPreferences.gridVisible ? 'Grid' : 'Grid off'} · {canvasPreferences.snapToGrid ? 'Snap' : 'Free move'} · {resolvedTheme}</span><span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span></footer>
    {commandPaletteOpen && <CommandPalette commands={commands} onClose={() => setCommandPaletteOpen(false)} />}{contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextItems()} onClose={closeContextMenu} />}{dialog && <Dialog state={dialog} onChange={(value) => setDialog((current) => current ? { ...current, value } : current)} onClose={() => setDialog(null)} />}
  </div>;
}

function Dialog({ state, onChange, onClose }: { state: DialogState; onChange: (value: string) => void; onClose: () => void }) {
  const submit = () => { state.onConfirm?.(state.type === 'rename' ? state.value : undefined); onClose(); };
  return <div className="modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-icon"><Sparkles size={17} /></div><div className="dialog-copy"><h2 id="dialog-title">{state.title}</h2>{state.message && <p>{state.message}</p>}{state.type === 'rename' && <input autoFocus value={state.value ?? ''} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && submit()} aria-label="New name" />}</div><div className="dialog-actions"><button className="subtle-button" onClick={onClose}>Cancel</button>{state.type !== 'notice' && <button className={`toolbar-button ${state.danger ? 'danger-fill' : 'primary'}`} onClick={submit}>{state.confirmLabel ?? 'Confirm'}</button>}{state.type === 'notice' && <button className="toolbar-button primary" onClick={onClose}>OK</button>}</div></section></div>;
}
