import { ChevronRight, FilePlus2, FolderTree, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react';
import type { MouseEvent } from 'react';
import { DIAGRAM_LABELS, type DiagramKind } from '../../shared/model';
import { getActiveDiagram, useProjectStore } from '../store/useProjectStore';

const DIAGRAM_KINDS: DiagramKind[] = ['class', 'object', 'package', 'component', 'deployment', 'use-case', 'activity', 'state-machine', 'sequence', 'communication'];

export function Sidebar({ collapsed, onToggle, onRename, onDelete, onDiagramMenu }: { collapsed: boolean; onToggle: () => void; onRename: () => void; onDelete: () => void; onDiagramMenu: (event: MouseEvent, diagramId: string) => void }) {
  const project = useProjectStore((state) => state.project);
  const activeDiagramId = useProjectStore((state) => state.activeDiagramId);
  const setActiveDiagram = useProjectStore((state) => state.setActiveDiagram);
  const addDiagram = useProjectStore((state) => state.addDiagram);
  const active = getActiveDiagram(project, activeDiagramId);

  return <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
    <div className="sidebar-brand"><div className="brand-mark">U</div>{!collapsed && <div><strong>UML Studio</strong><span>Local modeling workspace</span></div>}<button className="icon-button rail-toggle" onClick={onToggle} title={collapsed ? 'Expand navigator (Ctrl+Shift+1)' : 'Collapse navigator (Ctrl+Shift+1)'} aria-label={collapsed ? 'Expand navigator' : 'Collapse navigator'}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button></div>
    {!collapsed && <>
    <div className="sidebar-section-title"><span><FolderTree size={14} /> Project Explorer</span><span className="muted">{project.diagrams.length}</span></div>
    <div className="project-tree">
      <div className="project-root"><span className="tree-chevron">⌄</span><span className="project-dot" />{project.name}</div>
      <div className="diagram-list">{project.diagrams.map((diagram) => <div key={diagram.id} className={`diagram-row ${diagram.id === active?.id ? 'active' : ''}`}><button className="diagram-item" onClick={() => setActiveDiagram(diagram.id)}>
        <span className={`diagram-icon kind-${diagram.kind}`} />
        <span className="diagram-name">{diagram.name}</span>
        <span className="diagram-type">{DIAGRAM_LABELS[diagram.kind].replace(' Diagram', '')}</span>
      </button><button className="row-menu" title={`Actions for ${diagram.name}`} aria-label={`Actions for ${diagram.name}`} onClick={(event) => onDiagramMenu(event, diagram.id)}><MoreHorizontal size={14} /></button></div>)}</div>
    </div>
    <div className="sidebar-actions">
      <select value="" onChange={(event) => { if (event.target.value) addDiagram(event.target.value as DiagramKind); }}>
        <option value="">Add diagram...</option>
        {DIAGRAM_KINDS.map((kind) => <option value={kind} key={kind}>{DIAGRAM_LABELS[kind]}</option>)}
      </select>
      <button className="subtle-button" onClick={onRename} disabled={!active}><FilePlus2 size={14} /> Rename active diagram</button>
      <button className="subtle-button danger-button" onClick={onDelete} disabled={!active || project.diagrams.length <= 1}><Trash2 size={14} /> Delete active diagram</button>
    </div>
    <div className="sidebar-footer"><button className="new-diagram-link" onClick={() => addDiagram('class')}><Plus size={14} /> New class diagram</button><span>Private · local-only</span></div>
    </>}
    {collapsed && <div className="collapsed-nav"><button className="icon-button" title="Project Explorer" aria-label="Project Explorer"><FolderTree size={17} /></button><span className="collapsed-count">{project.diagrams.length}</span><ChevronRight size={15} /></div>}
  </aside>;
}
