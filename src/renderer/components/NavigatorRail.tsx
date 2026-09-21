import { ChevronDown, ChevronRight, FilePlus2, FolderTree, GripVertical, Layers3, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Search, Shapes, Trash2, Workflow } from 'lucide-react';
import { useMemo, useState, type DragEvent, type MouseEvent } from 'react';
import { DIAGRAM_LABELS, diagramElementKinds, ELEMENT_LABELS, type DiagramKind, type Project, type UmlElementKind } from '../../shared/model';
import { getActiveDiagram, useProjectStore } from '../store/useProjectStore';
import type { LeftRailTab } from '../store/useWorkspaceStore';

const DIAGRAM_KINDS: DiagramKind[] = ['class', 'object', 'package', 'component', 'deployment', 'use-case', 'activity', 'state-machine', 'sequence', 'communication'];
const TOOL_GROUPS: { title: string; kinds: UmlElementKind[] }[] = [
  { title: 'Structure', kinds: ['class', 'interface', 'object', 'package', 'component', 'node', 'artifact'] },
  { title: 'Behavior', kinds: ['actor', 'use-case', 'boundary', 'activity', 'state', 'initial', 'final', 'decision', 'fork', 'join'] },
  { title: 'Interaction', kinds: ['lifeline', 'note', 'partition'] },
];
const TOOL_DESCRIPTIONS: Partial<Record<UmlElementKind, string>> = {
  class: 'A UML classifier with attributes and operations.',
  interface: 'A contract that can be realized by classes.',
  actor: 'A role interacting with the system.',
  'use-case': 'A user-visible system capability.',
  activity: 'A step in an activity or workflow.',
  state: 'A state in a state machine.',
  lifeline: 'A participant in a sequence diagram.',
  note: 'A freeform annotation attached to the diagram.',
};

type NavigatorRailProps = {
  project: Project;
  activeDiagramId: string;
  tab: LeftRailTab;
  collapsed: boolean;
  onTabChange: (tab: LeftRailTab) => void;
  onToggle: () => void;
  onRename: (diagramId?: string) => void;
  onDelete: (diagramId?: string) => void;
  onDiagramMenu: (event: MouseEvent, diagramId: string) => void;
  onModelSelect: (elementId: string) => void;
};

export function NavigatorRail({ project, activeDiagramId, tab, collapsed, onTabChange, onToggle, onRename, onDelete, onDiagramMenu, onModelSelect }: NavigatorRailProps) {
  const active = getActiveDiagram(project, activeDiagramId);
  const addDiagram = useProjectStore((state) => state.addDiagram);
  const setActiveDiagram = useProjectStore((state) => state.setActiveDiagram);
  const [query, setQuery] = useState('');
  const [diagramPickerOpen, setDiagramPickerOpen] = useState(false);

  const tabs = [
    { id: 'diagrams' as const, label: 'Diagrams', icon: <Workflow size={14} /> },
    { id: 'model' as const, label: 'Model', icon: <Layers3 size={14} /> },
    { id: 'toolbox' as const, label: 'Toolbox', icon: <Shapes size={14} /> },
  ];

  if (collapsed) {
    return <aside className="navigator-rail collapsed"><div className="rail-brand"><div className="brand-mark">U</div><button className="rail-collapse" onClick={onToggle} title="Expand navigator" aria-label="Expand navigator"><PanelLeftOpen size={15} /></button></div><div className="collapsed-rail-tabs">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => { onToggle(); onTabChange(item.id); }} title={item.label} aria-label={item.label}>{item.icon}</button>)}</div></aside>;
  }

  return <aside className="navigator-rail">
    <div className="rail-brand"><div className="brand-mark">U</div><div><strong>UML Studio</strong><span>Modeling workspace</span></div><button className="rail-collapse" onClick={onToggle} title="Collapse navigator" aria-label="Collapse navigator"><PanelLeftClose size={15} /></button></div>
    <div className="rail-tabs" role="tablist" aria-label="Navigator views">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => onTabChange(item.id)}>{item.icon}<span>{item.label}</span></button>)}</div>
    <div className="rail-content">
      {tab === 'diagrams' && <WorkingDiagrams project={project} active={active} activeDiagramId={activeDiagramId} query={query} setQuery={setQuery} diagramPickerOpen={diagramPickerOpen} setDiagramPickerOpen={setDiagramPickerOpen} addDiagram={addDiagram} setActiveDiagram={setActiveDiagram} onRename={onRename} onDelete={onDelete} onDiagramMenu={onDiagramMenu} />}
      {tab === 'model' && <ModelExplorer project={project} query={query} setQuery={setQuery} onModelSelect={onModelSelect} />}
      {tab === 'toolbox' && <UmlToolbox diagramKind={active?.kind ?? 'class'} query={query} setQuery={setQuery} />}
    </div>
    <div className="rail-footer"><span><span className="status-dot" /> Local-only project</span><span>{project.diagrams.length} diagrams · {Object.keys(project.model.elements).length} elements</span></div>
  </aside>;
}

function RailSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="rail-search"><Search size={14} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>;
}

function WorkingDiagrams({ project, active, activeDiagramId, query, setQuery, diagramPickerOpen, setDiagramPickerOpen, addDiagram, setActiveDiagram, onRename, onDelete, onDiagramMenu }: { project: Project; active: ReturnType<typeof getActiveDiagram>; activeDiagramId: string; query: string; setQuery: (value: string) => void; diagramPickerOpen: boolean; setDiagramPickerOpen: (value: boolean) => void; addDiagram: (kind: DiagramKind) => void; setActiveDiagram: (id: string) => void; onRename: (id?: string) => void; onDelete: (id?: string) => void; onDiagramMenu: (event: MouseEvent, id: string) => void }) {
  const diagrams = project.diagrams.filter((diagram) => diagram.name.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="rail-section-heading"><div><Workflow size={15} /><span>Working diagrams</span></div><span className="count-badge">{project.diagrams.length}</span></div>
    <RailSearch value={query} onChange={setQuery} placeholder="Search diagrams" />
    <div className="working-diagrams">{diagrams.map((diagram) => <div key={diagram.id} className={`working-diagram ${diagram.id === activeDiagramId ? 'active' : ''}`}><button onClick={() => setActiveDiagram(diagram.id)} onDoubleClick={() => setActiveDiagram(diagram.id)}><span className={`diagram-glyph kind-${diagram.kind}`} /><span><strong>{diagram.name}</strong><small>{DIAGRAM_LABELS[diagram.kind]}</small></span></button><button className="row-action" onClick={(event) => onDiagramMenu(event, diagram.id)} aria-label={`Actions for ${diagram.name}`} title={`Actions for ${diagram.name}`}><MoreHorizontal size={14} /></button></div>)}</div>
    <div className="rail-section-heading compact"><div><FolderTree size={14} /><span>Project</span></div></div>
    <div className="project-summary"><span className="project-dot" /><span>{project.name}</span><ChevronDown size={13} /></div>
    <button className="primary-rail-action" onClick={() => setDiagramPickerOpen(!diagramPickerOpen)}><Plus size={14} /> New diagram <ChevronDown size={13} /></button>
    {diagramPickerOpen && <div className="diagram-picker">{DIAGRAM_KINDS.map((kind) => <button key={kind} onClick={() => { addDiagram(kind); setDiagramPickerOpen(false); }}><span className={`diagram-glyph kind-${kind}`} />{DIAGRAM_LABELS[kind]}</button>)}</div>}
    <div className="rail-inline-actions"><button onClick={() => onRename(active?.id)} disabled={!active}><FilePlus2 size={13} /> Rename</button><button onClick={() => onDelete(active?.id)} disabled={!active || project.diagrams.length <= 1}><Trash2 size={13} /> Delete</button></div>
  </>;
}

function ModelExplorer({ project, query, setQuery, onModelSelect }: { project: Project; query: string; setQuery: (value: string) => void; onModelSelect: (elementId: string) => void }) {
  const elements = Object.values(project.model.elements).filter((element) => `${element.name} ${element.kind} ${element.properties.stereotype ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  return <><div className="rail-section-heading"><div><Layers3 size={15} /><span>Model explorer</span></div><span className="count-badge">{elements.length}</span></div><RailSearch value={query} onChange={setQuery} placeholder="Search model" /><div className="model-tree"><div className="model-root"><ChevronDown size={13} /><span className="project-dot" />{project.name}</div>{elements.length === 0 && <div className="rail-empty">No model elements match your search.</div>}{elements.map((element) => <button key={element.id} className="model-tree-item" onClick={() => onModelSelect(element.id)}><span className={`model-kind kind-${element.kind}`}><GripVertical size={11} /></span><span><strong>{element.name}</strong><small>{ELEMENT_LABELS[element.kind]}{element.properties.stereotype ? ` · ${element.properties.stereotype}` : ''}</small></span></button>)}</div></>;
}

function UmlToolbox({ diagramKind, query, setQuery }: { diagramKind: DiagramKind; query: string; setQuery: (value: string) => void }) {
  const addElement = useProjectStore((state) => state.addElement);
  const available = useMemo(() => new Set(diagramElementKinds(diagramKind)), [diagramKind]);
  const normalized = query.trim().toLowerCase();
  const onDragStart = (event: DragEvent<HTMLButtonElement>, kind: UmlElementKind) => { event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('application/x-uml-element', kind); };
  return <><div className="rail-section-heading"><div><Shapes size={15} /><span>UML toolbox</span></div><span className="count-badge">{diagramElementKinds(diagramKind).length}</span></div><div className="toolbox-context"><span>Available for</span><strong>{DIAGRAM_LABELS[diagramKind]}</strong></div><RailSearch value={query} onChange={setQuery} placeholder="Search tools" /><div className="toolbox-groups">{TOOL_GROUPS.map((group) => { const kinds = group.kinds.filter((kind) => available.has(kind) && (!normalized || ELEMENT_LABELS[kind].toLowerCase().includes(normalized))); if (kinds.length === 0) return null; return <div className="toolbox-group" key={group.title}><div className="group-label">{group.title}</div>{kinds.map((kind) => <button key={kind} draggable onDragStart={(event) => onDragStart(event, kind)} onClick={() => addElement(kind)} title={TOOL_DESCRIPTIONS[kind] ?? `Add ${ELEMENT_LABELS[kind]}`}><span className={`tool-shape kind-${kind}`} /><span><strong>{ELEMENT_LABELS[kind]}</strong><small>{TOOL_DESCRIPTIONS[kind] ?? `Create a ${ELEMENT_LABELS[kind].toLowerCase()}.`}</small></span><Plus size={13} /></button>)}</div>; })}</div></>;
}
