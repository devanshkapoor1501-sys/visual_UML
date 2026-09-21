import { BaseEdge, EdgeLabelRenderer, getStraightPath, MarkerType, type EdgeProps } from '@xyflow/react';
import { relationshipIsDirectional, type RelationshipKind } from '../../shared/model';

export type UmlEdgeData = { kind: RelationshipKind; label?: string; sourceMultiplicity?: string; targetMultiplicity?: string; guard?: string };

export function UmlEdge(props: EdgeProps) {
  const data = props.data as UmlEdgeData | undefined;
  const [path, labelX, labelY] = getStraightPath({ sourceX: props.sourceX, sourceY: props.sourceY, targetX: props.targetX, targetY: props.targetY });
  const directional = data ? relationshipIsDirectional(data.kind) : false;
  const dashed = data?.kind === 'dependency' || data?.kind === 'extend' || data?.kind === 'include';
  const style = (data as UmlEdgeData & { style?: Record<string, string | number> } | undefined)?.style ?? {};
  const label = [data?.label, data?.guard && `[${data.guard}]`].filter(Boolean).join(' ');
  return (
    <>
      <BaseEdge id={props.id} path={path} markerEnd={directional ? MarkerType.ArrowClosed : undefined} style={{ stroke: props.selected ? '#2563eb' : String(style.stroke ?? '#50627a'), strokeWidth: props.selected ? 2.5 : Number(style.strokeWidth ?? 1.5), strokeDasharray: style.lineStyle === 'dotted' ? '2 4' : style.lineStyle === 'dashed' || dashed ? '6 4' : undefined }} />
      {(label || data?.sourceMultiplicity || data?.targetMultiplicity) && <EdgeLabelRenderer>
        <div className="edge-label" style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>
          {data?.sourceMultiplicity && <span className="edge-multiplicity source-multiplicity">{data.sourceMultiplicity}</span>}
          {label && <span>{label}</span>}
          {data?.targetMultiplicity && <span className="edge-multiplicity target-multiplicity">{data.targetMultiplicity}</span>}
        </div>
      </EdgeLabelRenderer>}
    </>
  );
}
