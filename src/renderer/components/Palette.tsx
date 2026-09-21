import { Plus, Search, Shapes } from 'lucide-react';
import { useState } from 'react';
import { diagramElementKinds, ELEMENT_LABELS, type DiagramKind, type UmlElementKind } from '../../shared/model';
import { useProjectStore } from '../store/useProjectStore';

const GROUPS: { title: string; kinds: UmlElementKind[] }[] = [
  { title: 'Structure', kinds: ['class', 'interface', 'object', 'package', 'component', 'node', 'artifact'] },
  { title: 'Behavior', kinds: ['actor', 'use-case', 'activity', 'state', 'initial', 'final', 'decision', 'fork', 'join'] },
  { title: 'Interaction', kinds: ['lifeline', 'note', 'partition'] },
];

export function Palette({ diagramKind }: { diagramKind: DiagramKind }) {
  const addElement = useProjectStore((state) => state.addElement);
  const [query, setQuery] = useState('');
  const available = new Set(diagramElementKinds(diagramKind));
  const normalizedQuery = query.trim().toLowerCase();
  return (
    <section className="panel palette-panel">
      <div className="panel-heading"><span><Shapes size={15} /> Palette</span><span className="muted">{diagramKind}</span></div>
      <label className="panel-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search elements" aria-label="Search palette" /></label>
      {GROUPS.map((group) => {
        const kinds = group.kinds.filter((kind) => available.has(kind) && (!normalizedQuery || ELEMENT_LABELS[kind].toLowerCase().includes(normalizedQuery)));
        if (kinds.length === 0) return null;
        return <div className="palette-group" key={group.title}>
          <div className="group-title">{group.title}</div>
          <div className="palette-grid">{kinds.map((kind) => <button className="palette-button" key={kind} title={`Add ${ELEMENT_LABELS[kind]}`} onClick={() => addElement(kind)}><Plus size={13} />{ELEMENT_LABELS[kind]}</button>)}</div>
        </div>;
      })}
      <p className="palette-hint">Add an element, then drag to arrange it. Select two nodes before using alignment tools.</p>
    </section>
  );
}
