import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type DragEvent } from 'react';
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type OnNodeDrag, type ReactFlowInstance } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { Grid3X3, Hand, Magnet, Map, MousePointer2, Scan, Share2, StickyNote, ZoomIn, ZoomOut } from 'lucide-react';
import { getActiveDiagram, useProjectStore } from '../store/useProjectStore';
import { useWorkspaceStore, type CanvasPreferences, type EditorTool } from '../store/useWorkspaceStore';
import { buildDiagramSvg, downloadDataUrl, downloadText } from '../lib/export';
import { validateRelationship, type DiagramKind, type Project, type RelationshipKind, type UmlElementKind } from '../../shared/model';
import { UmlNode } from './ElementNode';
import { UmlEdge } from './UmlEdge';

const nodeTypes = { uml: UmlNode };
const edgeTypes = { uml: UmlEdge };

export type UmlCanvasHandle = { exportPng: () => Promise<void>; exportSvg: () => void; fitView: () => void; zoomIn: () => void; zoomOut: () => void };
type CanvasContextEvent = { clientX: number; clientY: number; stopPropagation: () => void };

export const UmlCanvas = forwardRef<UmlCanvasHandle, { relationshipKind: RelationshipKind; editorTool: EditorTool; canvasPreferences: CanvasPreferences; focusNodeId?: string | null; onContextMenu: (event: CanvasContextEvent, type: 'canvas' | 'node' | 'edge', targetId?: string) => void; onNotice: (message: string) => void }>(({ relationshipKind, editorTool, canvasPreferences, focusNodeId, onContextMenu, onNotice }, ref) => {
  const project = useProjectStore((state) => state.project);
  const activeDiagramId = useProjectStore((state) => state.activeDiagramId);
  const diagram = getActiveDiagram(project, activeDiagramId);
  if (!diagram) return <div className="canvas-empty">Create a diagram to begin modeling.</div>;
  return <ReactFlowProvider><CanvasInner key={diagram.id} project={project} diagramKind={diagram.kind} diagramId={diagram.id} relationshipKind={relationshipKind} editorTool={editorTool} canvasPreferences={canvasPreferences} focusNodeId={focusNodeId} onContextMenu={onContextMenu} onNotice={onNotice} ref={ref} /></ReactFlowProvider>;
});

const CanvasInner = forwardRef<UmlCanvasHandle, { project: Project; diagramId: string; diagramKind: DiagramKind; relationshipKind: RelationshipKind; editorTool: EditorTool; canvasPreferences: CanvasPreferences; focusNodeId?: string | null; onContextMenu: (event: CanvasContextEvent, type: 'canvas' | 'node' | 'edge', targetId?: string) => void; onNotice: (message: string) => void }>(({ project, diagramId, diagramKind, relationshipKind, editorTool, canvasPreferences, focusNodeId, onContextMenu, onNotice }, ref) => {
  const diagram = project.diagrams.find((item) => item.id === diagramId)!;
  const selection = useProjectStore((state) => state.selection);
  const setSelection = useProjectStore((state) => state.setSelection);
  const updateView = useProjectStore((state) => state.updateView);
  const updateViewport = useProjectStore((state) => state.updateViewport);
  const addRelationship = useProjectStore((state) => state.addRelationship);
  const deleteSelection = useProjectStore((state) => state.deleteSelection);
  const addElementAt = useProjectStore((state) => state.addElementAt);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [instance, setInstance] = useState<ReactFlowInstance | null>(null);
  const programmaticSelection = useRef(false);

  const diagramNodes = useMemo<Node[]>(() => diagram.views.flatMap((view) => {
    const element = project.model.elements[view.elementId];
    if (!element) return [];
    return [{ id: element.id, type: 'uml', position: { x: view.x, y: view.y }, width: view.width, height: view.height, selected: selection.nodeIds.includes(element.id), data: { element, view } }];
  }), [diagram.views, project.model.elements, selection.nodeIds]);

  const diagramEdges = useMemo<Edge[]>(() => diagram.relationships.flatMap((relationship) => {
    if (!project.model.elements[relationship.sourceId] || !project.model.elements[relationship.targetId]) return [];
    return [{ id: relationship.id, source: relationship.sourceId, target: relationship.targetId, type: 'uml', selected: selection.edgeIds.includes(relationship.id), data: relationship }];
  }), [diagram.relationships, project.model.elements, selection.edgeIds]);

  useEffect(() => setNodes(diagramNodes), [diagramNodes]);
  useEffect(() => setEdges(diagramEdges), [diagramEdges]);
  useEffect(() => {
    if (!focusNodeId || !diagram.views.some((view) => view.elementId === focusNodeId)) return;
    programmaticSelection.current = true;
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === focusNodeId })));
    setSelection({ nodeIds: [focusNodeId], edgeIds: [] });
    const timeout = window.setTimeout(() => { programmaticSelection.current = false; }, 160);
    return () => window.clearTimeout(timeout);
  }, [focusNodeId, diagram.id, diagram.views, setSelection]);

  useImperativeHandle(ref, () => ({
    exportSvg: () => {
      const svg = buildDiagramSvg(project, diagram);
      downloadText(`${project.name}-${diagram.name}.svg`, svg, 'image/svg+xml');
    },
    exportPng: async () => {
      const viewport = document.querySelector(`[data-diagram-id="${diagram.id}"] .react-flow__viewport`) as HTMLElement | null;
      if (!viewport) return;
      const dataUrl = await toPng(viewport, { backgroundColor: '#ffffff', pixelRatio: 2, cacheBust: true });
      downloadDataUrl(`${project.name}-${diagram.name}.png`, dataUrl);
    },
    fitView: () => instance?.fitView({ padding: 0.2, duration: 300 }),
    zoomIn: () => instance?.zoomIn({ duration: 180 }),
    zoomOut: () => instance?.zoomOut({ duration: 180 }),
  }), [diagram, project, instance]);

  const onNodesChange = (changes: NodeChange[]) => setNodes((current) => applyNodeChanges(changes, current));
  const onEdgesChange = (changes: EdgeChange[]) => setEdges((current) => applyEdgeChanges(changes, current));
  const onNodeDragStop: OnNodeDrag = (_event, node) => {
    const size = canvasPreferences.gridSize;
    const x = canvasPreferences.snapToGrid ? Math.round(node.position.x / size) * size : node.position.x;
    const y = canvasPreferences.snapToGrid ? Math.round(node.position.y / size) * size : node.position.y;
    updateView(node.id, { x, y }, true);
  };
  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    const result = validateRelationship(diagramKind, project.model.elements[connection.source], project.model.elements[connection.target], relationshipKind);
    if (!result.valid) {
      onNotice(result.reason ?? 'That relationship is not valid for these elements.');
      return;
    }
    addRelationship(relationshipKind, connection.source, connection.target);
  };
  const onEdgesDelete = (deleted: Edge[]) => {
    if (deleted.length === 0) return;
    setSelection({ nodeIds: [], edgeIds: deleted.map((edge) => edge.id) });
    deleteSelection();
  };
  const onNodesDelete = (deleted: Node[]) => {
    if (deleted.length === 0) return;
    setSelection({ nodeIds: deleted.map((node) => node.id), edgeIds: [] });
    deleteSelection();
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData('application/x-uml-element') as UmlElementKind;
    if (!kind || !instance) return;
    const point = instance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addElementAt(kind, point.x, point.y);
  };

  return <div className={`canvas-shell editor-tool-${editorTool}`} data-diagram-id={diagram.id} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDragStop={onNodeDragStop}
      onConnect={onConnect}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onNodeContextMenu={(event, node) => { event.preventDefault(); onContextMenu(event, 'node', node.id); }}
      onEdgeContextMenu={(event, edge) => { event.preventDefault(); onContextMenu(event, 'edge', edge.id); }}
      onPaneContextMenu={(event) => { event.preventDefault(); onContextMenu(event, 'canvas'); }}
      onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => { if (!programmaticSelection.current) setSelection({ nodeIds: selectedNodes.map((node) => node.id), edgeIds: selectedEdges.map((edge) => edge.id) }); }}
      onPaneClick={(event) => {
        if (editorTool === 'note' && instance) {
          const point = instance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
          addElementAt('note', point.x, point.y);
          return;
        }
        setSelection({ nodeIds: [], edgeIds: [] });
      }}
      onMoveEnd={(_event, viewport) => updateViewport(viewport)}
      onInit={setInstance}
      defaultViewport={diagram.viewport}
      fitView={diagram.views.length === 0}
      minZoom={0.2}
      maxZoom={2.5}
      deleteKeyCode={['Backspace', 'Delete']}
      connectionRadius={28}
      onlyRenderVisibleElements={false}
      panOnDrag={editorTool === 'pan' || editorTool === 'select'}
      nodesDraggable={editorTool === 'select'}
      nodesConnectable={editorTool === 'select' || editorTool === 'connect'}
    >
      {canvasPreferences.gridVisible && <Background color="var(--canvas-grid)" gap={canvasPreferences.gridSize} size={1} />}
      <Controls showInteractive={false} />
      {canvasPreferences.minimapVisible && <MiniMap nodeColor="var(--minimap-node)" maskColor="var(--minimap-mask)" />}
      <div className="canvas-rulers"><span className="ruler-corner">+</span><span className="ruler-horizontal">10&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;20&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;30&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;40</span><span className="ruler-vertical">10<br /><br />20<br /><br />30<br /><br />40</span></div>
      {canvasPreferences.guidesVisible && <div className="canvas-guides" aria-hidden="true"><span className="guide guide-horizontal" /><span className="guide guide-vertical" /></div>}
      <div className="canvas-mode"><span className="tool-mode-icon">{editorTool === 'pan' ? <Hand size={13} /> : editorTool === 'connect' ? <Share2 size={13} /> : editorTool === 'note' ? <StickyNote size={13} /> : <MousePointer2 size={13} />}</span>{editorTool === 'pan' ? 'Pan canvas' : editorTool === 'connect' ? 'Connect elements' : editorTool === 'note' ? 'Click canvas to add a note' : 'Select and move elements'}</div>
      <div className="canvas-quick-tools"><span title={canvasPreferences.gridVisible ? 'Grid on' : 'Grid off'}><Grid3X3 size={12} /></span><span className={canvasPreferences.snapToGrid ? 'on' : ''} title={canvasPreferences.snapToGrid ? 'Snap on' : 'Snap off'}><Magnet size={12} /></span><span title="Minimap"><Map size={12} /></span><span title="Zoom controls"><ZoomIn size={12} /><ZoomOut size={12} /></span></div>
      <button className="fit-button" onClick={() => instance?.fitView({ padding: 0.2, duration: 300 })} title="Fit diagram to canvas"><Scan size={13} /> Fit diagram</button>
    </ReactFlow>
  </div>;
});
