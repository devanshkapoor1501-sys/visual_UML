import { AlignLeft, BoxSelect, Link2, Settings2 } from 'lucide-react';
import { ELEMENT_LABELS, relationshipKinds, RELATIONSHIP_LABELS, type ElementProperties } from '../../shared/model';
import { getActiveDiagram, useProjectStore } from '../store/useProjectStore';

function TextField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean }) {
  return <label className="inspector-field"><span>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>;
}

export function Inspector() {
  const project = useProjectStore((state) => state.project);
  const activeDiagramId = useProjectStore((state) => state.activeDiagramId);
  const selection = useProjectStore((state) => state.selection);
  const updateElement = useProjectStore((state) => state.updateElement);
  const updateRelationship = useProjectStore((state) => state.updateRelationship);
  const deleteSelection = useProjectStore((state) => state.deleteSelection);
  const diagram = getActiveDiagram(project, activeDiagramId);
  const element = selection.nodeIds.length === 1 ? project.model.elements[selection.nodeIds[0]] : undefined;
  const relationship = selection.edgeIds.length === 1 ? diagram?.relationships.find((item) => item.id === selection.edgeIds[0]) : undefined;

  if (!diagram) return null;

  return <section className="panel inspector-panel">
    <div className="panel-heading"><span><Settings2 size={15} /> Inspector</span>{(element || relationship) && <button className="text-button danger-text" onClick={deleteSelection}>Delete</button>}</div>
    {!element && !relationship && <div className="empty-inspector"><BoxSelect size={26} /><strong>Nothing selected</strong><span>Select an element or relationship to edit its properties.</span></div>}
    {element && <ElementInspector element={element} updateElement={updateElement} />}
    {relationship && <RelationshipInspector relationship={relationship} diagramKind={diagram.kind} updateRelationship={updateRelationship} />}
  </section>;
}

function ElementInspector({ element, updateElement }: { element: NonNullable<ReturnType<typeof useProjectStore.getState>['project']['model']['elements'][string]>; updateElement: ReturnType<typeof useProjectStore.getState>['updateElement'] }) {
  const props = element.properties;
  const updateProps = (patch: ElementProperties) => updateElement(element.id, { properties: patch });
  return <div className="inspector-body">
    <div className="selection-type"><span className="selection-dot" />{ELEMENT_LABELS[element.kind]}<span className="muted">{element.id.slice(-6)}</span></div>
    <TextField label="Name" value={element.name} onChange={(name) => updateElement(element.id, { name })} />
    {['class', 'interface', 'object', 'component', 'package'].includes(element.kind) && <TextField label="Stereotype" value={String(props.stereotype ?? '')} onChange={(stereotype) => updateProps({ stereotype })} />}
    {['class', 'interface', 'object'].includes(element.kind) && <>
      <TextField label="Attributes" multiline value={(props.attributes ?? []).join('\n')} onChange={(value) => updateProps({ attributes: value.split('\n').filter(Boolean) })} />
      <TextField label="Operations" multiline value={(props.operations ?? []).join('\n')} onChange={(value) => updateProps({ operations: value.split('\n').filter(Boolean) })} />
    </>}
    {['note', 'activity', 'state', 'partition', 'component', 'artifact'].includes(element.kind) && <TextField label="Documentation" multiline value={String(props.text ?? '')} onChange={(text) => updateProps({ text })} />}
    {element.kind === 'lifeline' && <TextField label="Participant" value={String(props.message ?? '')} onChange={(message) => updateProps({ message })} />}
    <div className="hint-row"><AlignLeft size={14} /> Changes are saved in the project history.</div>
  </div>;
}

function RelationshipInspector({ relationship, diagramKind, updateRelationship }: { relationship: NonNullable<ReturnType<typeof useProjectStore.getState>['project']['diagrams'][number]['relationships'][number]>; diagramKind: Parameters<typeof relationshipKinds>[0]; updateRelationship: ReturnType<typeof useProjectStore.getState>['updateRelationship'] }) {
  const update = (patch: Parameters<typeof updateRelationship>[1]) => updateRelationship(relationship.id, patch);
  return <div className="inspector-body">
    <div className="selection-type"><Link2 size={14} /> Relationship</div>
    <label className="inspector-field"><span>Type</span><select value={relationship.kind} onChange={(event) => update({ kind: event.target.value as typeof relationship.kind })}>{relationshipKinds(diagramKind).map((kind) => <option value={kind} key={kind}>{RELATIONSHIP_LABELS[kind]}</option>)}</select></label>
    <TextField label="Label" value={relationship.label ?? ''} onChange={(label) => update({ label })} />
    <div className="inspector-two-col"><TextField label="Source multiplicity" value={relationship.sourceMultiplicity ?? ''} onChange={(sourceMultiplicity) => update({ sourceMultiplicity })} /><TextField label="Target multiplicity" value={relationship.targetMultiplicity ?? ''} onChange={(targetMultiplicity) => update({ targetMultiplicity })} /></div>
    <TextField label="Guard" value={relationship.guard ?? ''} onChange={(guard) => update({ guard })} />
  </div>;
}

