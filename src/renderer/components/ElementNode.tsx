import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { CSSProperties } from 'react';
import { ELEMENT_LABELS, type DiagramView, type UmlElement } from '../../shared/model';

export type UmlNodeData = {
  element: UmlElement;
  view: DiagramView;
};

function Handles() {
  return (
    <>
      <Handle className="uml-handle" type="target" position={Position.Top} />
      <Handle className="uml-handle" type="source" position={Position.Bottom} />
      <Handle className="uml-handle" type="target" position={Position.Left} />
      <Handle className="uml-handle" type="source" position={Position.Right} />
    </>
  );
}

function ActorShape({ element }: { element: UmlElement }) {
  return <div className="actor-shape"><span className="actor-head">○</span><span className="actor-body">╱│╲</span><span className="actor-legs">╱ ╲</span><span className="actor-label">{element.name}</span></div>;
}

export function UmlNode({ data, selected }: NodeProps) {
  const { element, view } = data as unknown as UmlNodeData;
  const props = element.properties;
  const style = view.style ?? {};
  const nodeStyle: CSSProperties = {
    background: typeof style.fill === 'string' ? style.fill : undefined,
    borderColor: typeof style.stroke === 'string' ? style.stroke : undefined,
    borderWidth: typeof style.strokeWidth === 'number' ? style.strokeWidth : undefined,
    borderRadius: typeof style.radius === 'number' ? style.radius : undefined,
    fontSize: typeof style.fontSize === 'number' ? style.fontSize : undefined,
  };
  const classLike = ['class', 'interface', 'object'].includes(element.kind);
  const simpleShape = ['initial', 'final', 'decision', 'fork', 'join'].includes(element.kind);

  if (element.kind === 'actor') return <div className={`uml-node actor-node ${selected ? 'selected' : ''}`} style={nodeStyle}><Handles /><ActorShape element={element} /></div>;
  if (element.kind === 'use-case') return <div className={`uml-node use-case-node ${selected ? 'selected' : ''}`} style={nodeStyle}><Handles /><div className="use-case-shape">{element.name}</div></div>;
  if (element.kind === 'initial') return <div className={`uml-node tiny-node ${selected ? 'selected' : ''}`}><Handles /><div className="initial-shape" /></div>;
  if (element.kind === 'final') return <div className={`uml-node tiny-node ${selected ? 'selected' : ''}`}><Handles /><div className="final-shape"><span /></div></div>;
  if (element.kind === 'decision') return <div className={`uml-node tiny-node ${selected ? 'selected' : ''}`}><Handles /><div className="decision-shape" /></div>;
  if (element.kind === 'fork' || element.kind === 'join') return <div className={`uml-node bar-node ${selected ? 'selected' : ''}`}><Handles /><div className="fork-shape" /></div>;
  if (element.kind === 'note') return <div className={`uml-node note-node ${selected ? 'selected' : ''}`} style={nodeStyle}><Handles /><div className="note-fold" /><div className="node-text">{props.text || element.name}</div></div>;
  if (element.kind === 'partition') return <div className={`uml-node partition-node ${selected ? 'selected' : ''}`} style={nodeStyle}><Handles /><div className="partition-title">{element.name}</div><div className="partition-content">Partition</div></div>;
  if (element.kind === 'lifeline') return <div className={`uml-node lifeline-node ${selected ? 'selected' : ''}`} style={nodeStyle}><Handles /><div className="lifeline-head">{element.name}</div><div className="lifeline-line" /></div>;
  if (simpleShape) return null;

  return (
    <div className={`uml-node ${classLike ? 'class-like' : 'component-like'} ${selected ? 'selected' : ''}`} style={nodeStyle}>
      <Handles />
      <div className="node-header">
        {props.stereotype && <div className="stereotype">&lt;&lt;{props.stereotype}&gt;&gt;</div>}
        <div className="node-title">{element.name}</div>
        {element.kind === 'component' && <span className="component-glyph">▣</span>}
      </div>
      {classLike && <>
        <div className="node-compartment">{(props.attributes ?? []).map((item, index) => <div key={`${item}-${index}`}>{item}</div>)}</div>
        <div className="node-compartment">{(props.operations ?? []).map((item, index) => <div key={`${item}-${index}`}>{item}</div>)}</div>
      </>}
      {!classLike && <div className="node-body">{ELEMENT_LABELS[element.kind]}{props.text && <div>{props.text}</div>}</div>}
    </div>
  );
}
