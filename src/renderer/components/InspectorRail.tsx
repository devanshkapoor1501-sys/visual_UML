import { BookOpen, Code2, Eye, FileText, Palette, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { ELEMENT_LABELS, RELATIONSHIP_LABELS, type Diagram, type Project } from '../../shared/model';
import { getActiveDiagram, useProjectStore } from '../store/useProjectStore';
import type { RightRailTab } from '../store/useWorkspaceStore';
import { Inspector } from './Inspector';

type InspectorRailProps = {
  project: Project;
  activeDiagramId: string;
  selection: { nodeIds: string[]; edgeIds: string[] };
  tab: RightRailTab;
  focusedModelId?: string | null;
  onTabChange: (tab: RightRailTab) => void;
  onDelete: () => void;
  onModelSelect: (elementId: string) => void;
};

const tabs: { id: RightRailTab; label: string; icon: JSX.Element }[] = [
  { id: 'model', label: 'Model', icon: <Code2 size={14} /> },
  { id: 'properties', label: 'Properties', icon: <SlidersHorizontal size={14} /> },
  { id: 'style', label: 'Style', icon: <Palette size={14} /> },
  { id: 'documentation', label: 'Docs', icon: <BookOpen size={14} /> },
];

export function InspectorRail({ project, activeDiagramId, selection, tab, focusedModelId, onTabChange, onDelete, onModelSelect }: InspectorRailProps) {
  const diagram = getActiveDiagram(project, activeDiagramId);
  const selected = selection.nodeIds.length === 1 ? project.model.elements[selection.nodeIds[0]] : undefined;
  const relationship = selection.edgeIds.length === 1 ? diagram?.relationships.find((item) => item.id === selection.edgeIds[0]) : undefined;
  return <aside className="inspector-rail">
    <div className="inspector-rail-header"><div><span className="eyebrow">INSPECTOR</span><strong>{selected?.name ?? (relationship ? RELATIONSHIP_LABELS[relationship.kind] : 'Workspace')}</strong></div>{(selected || relationship) && <button className="danger-icon" onClick={onDelete} title="Delete selection" aria-label="Delete selection"><Trash2 size={14} /></button>}</div>
    <div className="inspector-tabs" role="tablist" aria-label="Inspector views">{tabs.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => onTabChange(item.id)}>{item.icon}<span>{item.label}</span></button>)}</div>
    <div className="inspector-scroll">
      {tab === 'model' && <ModelSummary project={project} diagram={diagram} onModelSelect={onModelSelect} />}
      {tab === 'properties' && (focusedModelId && !selected && !relationship ? <NotPlacedInspector project={project} elementId={focusedModelId} onPlaced={onModelSelect} /> : <Inspector />)}
      {tab === 'style' && <StyleInspector project={project} diagram={diagram} selection={selection} />}
      {tab === 'documentation' && <DocumentationInspector project={project} selection={selection} />}
    </div>
  </aside>;
}

function NotPlacedInspector({ project, elementId, onPlaced }: { project: Project; elementId: string; onPlaced: (elementId: string) => void }) {
  const element = project.model.elements[elementId];
  const addExistingElementToDiagram = useProjectStore((state) => state.addExistingElementToDiagram);
  if (!element) return <div className="rail-empty">This model element no longer exists.</div>;
  return <div className="not-placed-inspector"><div className="summary-icon"><Code2 size={17} /></div><span className="eyebrow">MODEL ELEMENT</span><h3>{element.name}</h3><p>{ELEMENT_LABELS[element.kind]} exists in the shared model but is not placed on the active diagram.</p><button className="primary-rail-action" onClick={() => { addExistingElementToDiagram(element.id); onPlaced(element.id); }}><PlusIcon /> Place on diagram</button></div>;
}

function PlusIcon() { return <span aria-hidden="true">＋</span>; }

function ModelSummary({ project, diagram, onModelSelect }: { project: Project; diagram?: Diagram; onModelSelect: (id: string) => void }) {
  const placedIds = useMemo(() => new Set(diagram?.views.map((view) => view.elementId) ?? []), [diagram?.views]);
  const elements = Object.values(project.model.elements);
  return <div className="model-summary"><div className="summary-card"><span className="summary-icon"><Code2 size={16} /></span><div><strong>{elements.length} model elements</strong><small>{placedIds.size} placed on this diagram</small></div></div><div className="summary-heading"><span>Model elements</span><span className="muted">Click to focus</span></div>{elements.length === 0 && <div className="rail-empty">Add an element from the toolbox to start building your model.</div>}{elements.map((element) => <button key={element.id} className={`summary-element ${placedIds.has(element.id) ? 'placed' : ''}`} onClick={() => onModelSelect(element.id)}><span className={`model-kind kind-${element.kind}`} /><span><strong>{element.name}</strong><small>{ELEMENT_LABELS[element.kind]}</small></span><Eye size={13} /></button>)}</div>;
}

function StyleInspector({ project, diagram, selection }: { project: Project; diagram?: Diagram; selection: { nodeIds: string[]; edgeIds: string[] } }) {
  const updateView = useProjectStore((state) => state.updateView);
  const updateRelationship = useProjectStore((state) => state.updateRelationship);
  const view = selection.nodeIds.length === 1 ? diagram?.views.find((item) => item.elementId === selection.nodeIds[0]) : undefined;
  const relationship = selection.edgeIds.length === 1 ? diagram?.relationships.find((item) => item.id === selection.edgeIds[0]) : undefined;
  if (!view && !relationship) return <EmptyInspector icon={<Palette size={25} />} title="No style target" message="Select an element or relationship to edit its visual style." />;
  const style = (view?.style ?? relationship?.style ?? {}) as Record<string, string | number>;
  const setStyle = (key: string, value: string | number) => {
    const next = { ...style, [key]: value };
    if (view) updateView(view.elementId, { style: next });
    if (relationship) updateRelationship(relationship.id, { style: next });
  };
  const colorValue = (key: string, fallback: string) => String(style[key] ?? fallback);
  return <div className="style-inspector"><InspectorSection title="Appearance" icon={<Eye size={14} />}><ColorField label="Fill" value={colorValue('fill', '#ffffff')} onChange={(value) => setStyle('fill', value)} /><ColorField label="Stroke" value={colorValue('stroke', '#334155')} onChange={(value) => setStyle('stroke', value)} /><NumberField label="Stroke width" value={Number(style.strokeWidth ?? 1.5)} min={0.5} max={8} step={0.5} onChange={(value) => setStyle('strokeWidth', value)} /></InspectorSection>{view && <InspectorSection title="Shape" icon={<SlidersHorizontal size={14} />}><NumberField label="Corner radius" value={Number(style.radius ?? 5)} min={0} max={32} step={1} onChange={(value) => setStyle('radius', value)} /><NumberField label="Font size" value={Number(style.fontSize ?? 12)} min={8} max={32} step={1} onChange={(value) => setStyle('fontSize', value)} /></InspectorSection>}{relationship && <InspectorSection title="Line" icon={<Code2 size={14} />}><label className="inspector-field"><span>Line style</span><select value={String(style.lineStyle ?? 'solid')} onChange={(event) => setStyle('lineStyle', event.target.value)}><option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option></select></label></InspectorSection>}<p className="inspector-note">Style changes are stored on the diagram view and remain compatible with `.umlproj` files.</p></div>;
}

function DocumentationInspector({ project, selection }: { project: Project; selection: { nodeIds: string[]; edgeIds: string[] } }) {
  const element = selection.nodeIds.length === 1 ? project.model.elements[selection.nodeIds[0]] : undefined;
  const updateElement = useProjectStore((state) => state.updateElement);
  if (!element) return <EmptyInspector icon={<FileText size={25} />} title="No documentation target" message="Select an element to edit its documentation." />;
  return <div className="documentation-inspector"><div className="doc-heading"><FileText size={15} /><span>Documentation</span></div><label className="inspector-field"><span>{element.name} notes</span><textarea rows={13} value={String(element.properties.text ?? '')} onChange={(event) => updateElement(element.id, { properties: { text: event.target.value } })} placeholder="Describe the element, its responsibilities, or design decisions…" /></label><p className="inspector-note">Documentation is part of the model and is saved with the project.</p></div>;
}

function InspectorSection({ title, icon, children }: { title: string; icon: JSX.Element; children: React.ReactNode }) {
  return <section className="inspector-section"><div className="inspector-section-heading">{icon}<strong>{title}</strong></div>{children}</section>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="style-field"><span>{label}</span><span className="color-input"><input type="color" value={value.startsWith('#') ? value : '#ffffff'} onChange={(event) => onChange(event.target.value)} /><input value={value} onChange={(event) => onChange(event.target.value)} aria-label={`${label} color`} /></span></label>;
}

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return <label className="style-field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function EmptyInspector({ icon, title, message }: { icon: JSX.Element; title: string; message: string }) {
  return <div className="empty-inspector"><span className="empty-icon">{icon}</span><strong>{title}</strong><span>{message}</span></div>;
}
