import { AlignCenterHorizontal, AlignLeft, Grid3X3, Hand, Magnet, Map, MousePointer2, Redo2, Ruler, Scan, Share2, StickyNote, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import { RELATIONSHIP_LABELS, relationshipKinds, type DiagramKind, type RelationshipKind } from '../../shared/model';
import type { CanvasPreferences, EditorTool } from '../store/useWorkspaceStore';

type CanvasToolbarProps = {
  diagramKind: DiagramKind;
  relationshipKind: RelationshipKind;
  onRelationshipKindChange: (kind: RelationshipKind) => void;
  editorTool: EditorTool;
  onEditorToolChange: (tool: EditorTool) => void;
  preferences: CanvasPreferences;
  onPreferenceChange: <K extends keyof CanvasPreferences>(key: K, value: CanvasPreferences[K]) => void;
  selectionCount: number;
  onUndo: () => void;
  onRedo: () => void;
  onAlign: (axis: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

export function CanvasToolbar({ diagramKind, relationshipKind, onRelationshipKindChange, editorTool, onEditorToolChange, preferences, onPreferenceChange, selectionCount, onUndo, onRedo, onAlign, onDistribute, onFit, onZoomIn, onZoomOut }: CanvasToolbarProps) {
  const tool = (id: EditorTool, label: string, shortcut: string, icon: React.ReactNode) => <button className={`canvas-tool ${editorTool === id ? 'active' : ''}`} onClick={() => onEditorToolChange(id)} title={`${label} (${shortcut})`} aria-label={label}>{icon}<span>{label}</span><kbd>{shortcut}</kbd></button>;
  const toggle = (key: keyof CanvasPreferences, label: string, icon: React.ReactNode) => <button className={`toolbar-icon toggle-button ${preferences[key] ? 'on' : ''}`} onClick={() => onPreferenceChange(key, !preferences[key] as CanvasPreferences[typeof key])} title={label} aria-label={label}>{icon}</button>;
  return <div className="canvas-toolbar redesign-toolbar">
    <div className="toolbar-cluster">{tool('select', 'Select', '1', <MousePointer2 size={15} />)}{tool('pan', 'Pan', '2', <Hand size={15} />)}{tool('connect', 'Connect', '3', <Share2 size={15} />)}{tool('note', 'Note', '4', <StickyNote size={15} />)}</div>
    <span className="toolbar-divider" />
    <div className="toolbar-cluster compact"><button className="toolbar-icon" onClick={onUndo} title="Undo (Ctrl+Z)" aria-label="Undo"><Undo2 size={15} /></button><button className="toolbar-icon" onClick={onRedo} title="Redo (Ctrl+Y)" aria-label="Redo"><Redo2 size={15} /></button><button className="toolbar-icon" disabled={selectionCount < 2} onClick={() => onAlign('center')} title="Align centers" aria-label="Align centers"><AlignCenterHorizontal size={15} /></button><button className="toolbar-icon" disabled={selectionCount < 3} onClick={() => onDistribute('horizontal')} title="Distribute horizontally" aria-label="Distribute horizontally"><AlignLeft size={15} /></button></div>
    <span className="toolbar-divider" />
    <label className="toolbar-select"><span>Connect as</span><select value={relationshipKind} onChange={(event) => onRelationshipKindChange(event.target.value as RelationshipKind)}>{relationshipKinds(diagramKind).map((kind) => <option value={kind} key={kind}>{RELATIONSHIP_LABELS[kind]}</option>)}</select></label>
    <div className="toolbar-spacer" />
    <div className="toolbar-cluster compact">{toggle('gridVisible', 'Toggle grid', <Grid3X3 size={14} />)}{toggle('snapToGrid', 'Toggle snapping', <Magnet size={14} />)}{toggle('guidesVisible', 'Toggle guides', <Ruler size={14} />)}{toggle('minimapVisible', 'Toggle minimap', <Map size={14} />)}<button className="toolbar-icon" onClick={onZoomOut} title="Zoom out" aria-label="Zoom out"><ZoomOut size={15} /></button><button className="toolbar-icon" onClick={onFit} title="Fit diagram" aria-label="Fit diagram"><Scan size={15} /></button><button className="toolbar-icon" onClick={onZoomIn} title="Zoom in" aria-label="Zoom in"><ZoomIn size={15} /></button></div>
  </div>;
}
