export const CURRENT_SCHEMA_VERSION = 1;

export type DiagramKind =
  | 'class'
  | 'object'
  | 'package'
  | 'component'
  | 'deployment'
  | 'use-case'
  | 'activity'
  | 'state-machine'
  | 'sequence'
  | 'communication';

export type UmlElementKind =
  | 'class'
  | 'object'
  | 'package'
  | 'component'
  | 'node'
  | 'artifact'
  | 'interface'
  | 'actor'
  | 'use-case'
  | 'boundary'
  | 'activity'
  | 'initial'
  | 'final'
  | 'decision'
  | 'state'
  | 'fork'
  | 'join'
  | 'lifeline'
  | 'note'
  | 'partition';

export type RelationshipKind =
  | 'association'
  | 'directed-association'
  | 'dependency'
  | 'generalization'
  | 'realization'
  | 'aggregation'
  | 'composition'
  | 'include'
  | 'extend'
  | 'control-flow'
  | 'object-flow'
  | 'transition'
  | 'message'
  | 'link';

export type Point = { x: number; y: number };
export type Viewport = { x: number; y: number; zoom: number };

export type ElementProperties = {
  stereotype?: string;
  attributes?: string[];
  operations?: string[];
  text?: string;
  visibility?: string;
  multiplicity?: string;
  guard?: string;
  message?: string;
  [key: string]: unknown;
};

export type UmlElement = {
  id: string;
  kind: UmlElementKind;
  name: string;
  properties: ElementProperties;
};

export type DiagramView = {
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: Record<string, string | number>;
};

export type DiagramRelationship = {
  id: string;
  kind: RelationshipKind;
  sourceId: string;
  targetId: string;
  label?: string;
  sourceMultiplicity?: string;
  targetMultiplicity?: string;
  guard?: string;
  points?: Point[];
  style?: Record<string, string | number>;
};

export type Diagram = {
  id: string;
  name: string;
  kind: DiagramKind;
  views: DiagramView[];
  relationships: DiagramRelationship[];
  viewport: Viewport;
};

export type UmlModel = {
  elements: Record<string, UmlElement>;
};

export type Project = {
  id: string;
  name: string;
  diagrams: Diagram[];
  model: UmlModel;
  version: number;
  schemaVersion: number;
};

export const DIAGRAM_LABELS: Record<DiagramKind, string> = {
  class: 'Class Diagram',
  object: 'Object Diagram',
  package: 'Package Diagram',
  component: 'Component Diagram',
  deployment: 'Deployment Diagram',
  'use-case': 'Use Case Diagram',
  activity: 'Activity Diagram',
  'state-machine': 'State Machine Diagram',
  sequence: 'Sequence Diagram',
  communication: 'Communication Diagram',
};

export const ELEMENT_LABELS: Record<UmlElementKind, string> = {
  class: 'Class',
  object: 'Object',
  package: 'Package',
  component: 'Component',
  node: 'Node',
  artifact: 'Artifact',
  interface: 'Interface',
  actor: 'Actor',
  'use-case': 'Use Case',
  boundary: 'Boundary',
  activity: 'Activity',
  initial: 'Initial Node',
  final: 'Final Node',
  decision: 'Decision',
  state: 'State',
  fork: 'Fork',
  join: 'Join',
  lifeline: 'Lifeline',
  note: 'Note',
  partition: 'Partition',
};

export const RELATIONSHIP_LABELS: Record<RelationshipKind, string> = {
  association: 'Association',
  'directed-association': 'Directed Association',
  dependency: 'Dependency',
  generalization: 'Generalization',
  realization: 'Realization',
  aggregation: 'Aggregation',
  composition: 'Composition',
  include: 'Include',
  extend: 'Extend',
  'control-flow': 'Control Flow',
  'object-flow': 'Object Flow',
  transition: 'Transition',
  message: 'Message',
  link: 'Link',
};

export const STRUCTURAL_KINDS: UmlElementKind[] = [
  'class',
  'object',
  'package',
  'component',
  'node',
  'artifact',
  'interface',
];

export function newId(prefix = 'id'): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function defaultElement(kind: UmlElementKind, id = newId('element')): UmlElement {
  const names: Record<UmlElementKind, string> = {
    class: 'Class',
    object: 'object:Class',
    package: 'package',
    component: 'Component',
    node: 'Node',
    artifact: 'Artifact',
    interface: 'Interface',
    actor: 'Actor',
    'use-case': 'Use Case',
    boundary: 'Boundary',
    activity: 'Activity',
    initial: 'Initial',
    final: 'Final',
    decision: 'Decision',
    state: 'State',
    fork: 'Fork',
    join: 'Join',
    lifeline: 'Lifeline',
    note: 'Note',
    partition: 'Partition',
  };

  return {
    id,
    kind,
    name: names[kind],
    properties: {
      stereotype: kind === 'interface' ? 'interface' : '',
      attributes: ['+ id: UUID'],
      operations: ['+ execute(): void'],
      text: kind === 'note' ? 'Add a note...' : '',
      visibility: '+',
      message: kind === 'lifeline' ? 'participant' : '',
    },
  };
}

export function defaultView(elementId: string, index = 0): DiagramView {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    elementId,
    x: 100 + column * 260,
    y: 80 + row * 190,
    width: 190,
    height: 120,
  };
}

export function diagramElementKinds(kind: DiagramKind): UmlElementKind[] {
  switch (kind) {
    case 'class':
      return ['class', 'interface', 'note'];
    case 'object':
      return ['object', 'class', 'note'];
    case 'package':
      return ['package', 'class', 'interface', 'note'];
    case 'component':
      return ['component', 'interface', 'artifact', 'note'];
    case 'deployment':
      return ['node', 'artifact', 'component', 'note'];
    case 'use-case':
      return ['actor', 'use-case', 'boundary', 'note'];
    case 'activity':
      return ['initial', 'activity', 'decision', 'fork', 'join', 'final', 'partition', 'note'];
    case 'state-machine':
      return ['initial', 'state', 'decision', 'final', 'note'];
    case 'sequence':
      return ['actor', 'lifeline', 'note'];
    case 'communication':
      return ['actor', 'object', 'component', 'note'];
  }
}

export function relationshipKinds(kind: DiagramKind): RelationshipKind[] {
  switch (kind) {
    case 'class':
      return ['association', 'directed-association', 'generalization', 'realization', 'aggregation', 'composition', 'dependency'];
    case 'object':
    case 'communication':
      return ['link', 'association', 'dependency', 'message'];
    case 'package':
    case 'component':
    case 'deployment':
      return ['dependency', 'association', 'generalization', 'realization', 'aggregation', 'composition'];
    case 'use-case':
      return ['association', 'include', 'extend', 'generalization', 'dependency'];
    case 'activity':
      return ['control-flow', 'object-flow', 'dependency'];
    case 'state-machine':
      return ['transition', 'dependency'];
    case 'sequence':
      return ['message', 'dependency'];
  }
}

export function relationshipIsDirectional(kind: RelationshipKind): boolean {
  return ['directed-association', 'dependency', 'generalization', 'realization', 'include', 'extend', 'control-flow', 'object-flow', 'transition', 'message'].includes(kind);
}

export function validateRelationship(
  diagramKind: DiagramKind,
  source: UmlElement | undefined,
  target: UmlElement | undefined,
  kind: RelationshipKind,
): { valid: boolean; reason?: string } {
  if (!source || !target) return { valid: false, reason: 'Both endpoints must exist.' };
  if (source.id === target.id) return { valid: false, reason: 'An element cannot connect to itself.' };
  if (!relationshipKinds(diagramKind).includes(kind)) return { valid: false, reason: `${RELATIONSHIP_LABELS[kind]} is not available on this diagram.` };
  if (diagramKind === 'sequence' && kind === 'message' && !['lifeline', 'actor'].includes(source.kind)) {
    return { valid: false, reason: 'Sequence messages must start at an actor or lifeline.' };
  }
  if (diagramKind === 'use-case' && ['include', 'extend'].includes(kind) && source.kind !== 'use-case') {
    return { valid: false, reason: 'Include and extend relationships start at a use case.' };
  }
  if (['generalization', 'realization', 'aggregation', 'composition'].includes(kind) && !STRUCTURAL_KINDS.includes(source.kind)) {
    return { valid: false, reason: 'This relationship requires structural UML elements.' };
  }
  return { valid: true };
}

export function createEmptyProject(name = 'Untitled UML Project'): Project {
  const diagramId = newId('diagram');
  return {
    id: newId('project'),
    name,
    version: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    model: { elements: {} },
    diagrams: [
      {
        id: diagramId,
        name: 'Class Diagram 1',
        kind: 'class',
        views: [],
        relationships: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    ],
  };
}

export function cloneProject(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project;
}

