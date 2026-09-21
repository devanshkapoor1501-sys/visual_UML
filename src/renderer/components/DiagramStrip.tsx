import { ChevronDown, ChevronUp, MoreHorizontal, Plus, Workflow } from 'lucide-react';
import type { MouseEvent } from 'react';
import { DIAGRAM_LABELS, type Diagram, type DiagramKind } from '../../shared/model';
import { useProjectStore } from '../store/useProjectStore';

export function DiagramStrip({ diagrams, activeDiagramId, collapsed, onToggle, onDiagramMenu }: { diagrams: Diagram[]; activeDiagramId: string; collapsed: boolean; onToggle: () => void; onDiagramMenu: (event: MouseEvent, diagramId: string) => void }) {
  const setActiveDiagram = useProjectStore((state) => state.setActiveDiagram);
  const addDiagram = useProjectStore((state) => state.addDiagram);
  return <section className={`diagram-strip ${collapsed ? 'collapsed' : ''}`}>
    <div className="diagram-strip-header"><div><Workflow size={14} /><strong>Working diagrams</strong><span className="count-badge">{diagrams.length}</span></div><div className="strip-actions"><button onClick={() => addDiagram('class')} title="Add class diagram" aria-label="Add class diagram"><Plus size={14} /></button><button onClick={onToggle} title={collapsed ? 'Expand diagram thumbnails' : 'Collapse diagram thumbnails'} aria-label={collapsed ? 'Expand diagram thumbnails' : 'Collapse diagram thumbnails'}>{collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button></div></div>
    {!collapsed && <div className="diagram-strip-scroll">{diagrams.map((diagram) => <div key={diagram.id} className={`diagram-card ${diagram.id === activeDiagramId ? 'active' : ''}`}><button className="diagram-card-main" onClick={() => setActiveDiagram(diagram.id)}><DiagramThumbnail kind={diagram.kind} diagram={diagram} /><span className="diagram-card-copy"><strong>{diagram.name}</strong><small>{DIAGRAM_LABELS[diagram.kind]} · {diagram.views.length} views</small></span></button><button className="row-action" onClick={(event) => onDiagramMenu(event, diagram.id)} aria-label={`Actions for ${diagram.name}`} title={`Actions for ${diagram.name}`}><MoreHorizontal size={14} /></button></div>)}</div>}
  </section>;
}

function DiagramThumbnail({ kind, diagram }: { kind: DiagramKind; diagram: Diagram }) {
  const views = diagram.views.slice(0, 12);
  return <span className={`diagram-thumbnail kind-${kind}`} aria-hidden="true">{views.map((view, index) => <span key={`${view.elementId}-${index}`} className="thumbnail-node" style={{ left: `${Math.min(82, 7 + (view.x % 380) / 5)}%`, top: `${Math.min(70, 8 + (view.y % 240) / 4)}%`, width: `${Math.max(12, Math.min(30, view.width / 9))}%`, height: `${Math.max(10, Math.min(22, view.height / 8))}%` }} />)}{views.length === 0 && <span className="thumbnail-empty">+</span>}</span>;
}
