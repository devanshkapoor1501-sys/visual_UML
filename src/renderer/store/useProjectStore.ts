import { create } from 'zustand';
import {
  cloneProject,
  createEmptyProject,
  defaultElement,
  defaultView,
  newId,
  validateRelationship,
  type DiagramKind,
  type DiagramRelationship,
  type DiagramView,
  type ElementProperties,
  type Project,
  type RelationshipKind,
  type UmlElementKind,
  type Viewport,
} from '../../shared/model';

type Selection = { nodeIds: string[]; edgeIds: string[] };

type ProjectStore = {
  project: Project;
  activeDiagramId: string;
  selection: Selection;
  history: Project[];
  future: Project[];
  dirty: boolean;
  filePath?: string;
  commit: (mutator: (project: Project) => void) => void;
  newProject: () => void;
  setProject: (project: Project, filePath?: string) => void;
  markClean: (filePath?: string) => void;
  setSelection: (selection: Selection) => void;
  setActiveDiagram: (diagramId: string) => void;
  renameProject: (name: string) => void;
  addDiagram: (kind: DiagramKind) => void;
  duplicateDiagram: (diagramId: string) => void;
  renameDiagram: (diagramId: string, name: string) => void;
  deleteDiagram: (diagramId: string) => void;
  addElement: (kind: UmlElementKind) => void;
  addElementAt: (kind: UmlElementKind, x: number, y: number) => void;
  updateElement: (elementId: string, patch: Partial<{ name: string; properties: ElementProperties }>) => void;
  updateView: (elementId: string, patch: Partial<DiagramView>, recordHistory?: boolean) => void;
  updateViewport: (viewport: Viewport) => void;
  addRelationship: (kind: RelationshipKind, sourceId: string, targetId: string) => void;
  updateRelationship: (relationshipId: string, patch: Partial<DiagramRelationship>) => void;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  alignSelection: (axis: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelection: (axis: 'horizontal' | 'vertical') => void;
  undo: () => void;
  redo: () => void;
};

const MAX_HISTORY = 60;

function sameIds(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function activeDiagram(project: Project, diagramId: string) {
  return project.diagrams.find((diagram) => diagram.id === diagramId) ?? project.diagrams[0];
}

const initialProject = createEmptyProject();

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: initialProject,
  activeDiagramId: initialProject.diagrams[0].id,
  selection: { nodeIds: [], edgeIds: [] },
  history: [],
  future: [],
  dirty: false,

  commit: (mutator) => {
    const current = get().project;
    const next = cloneProject(current);
    mutator(next);
    set((state) => ({
      project: next,
      history: [...state.history, current].slice(-MAX_HISTORY),
      future: [],
      dirty: true,
    }));
  },

  newProject: () => {
    const project = createEmptyProject();
    set({ project, activeDiagramId: project.diagrams[0].id, selection: { nodeIds: [], edgeIds: [] }, history: [], future: [], dirty: false, filePath: undefined });
  },

  setProject: (project, filePath) => set({ project, activeDiagramId: project.diagrams[0]?.id ?? '', selection: { nodeIds: [], edgeIds: [] }, history: [], future: [], dirty: false, filePath }),
  markClean: (filePath) => set({ dirty: false, filePath: filePath ?? get().filePath }),
  setSelection: (selection) => set((state) => sameIds(state.selection.nodeIds, selection.nodeIds) && sameIds(state.selection.edgeIds, selection.edgeIds) ? state : { selection }),
  setActiveDiagram: (activeDiagramId) => set({ activeDiagramId, selection: { nodeIds: [], edgeIds: [] } }),

  renameProject: (name) => get().commit((project) => { project.name = name || 'Untitled UML Project'; }),

  addDiagram: (kind) => {
    const diagramId = newId('diagram');
    get().commit((project) => {
      const count = project.diagrams.filter((diagram) => diagram.kind === kind).length + 1;
      project.diagrams.push({ id: diagramId, name: `${kind === 'use-case' ? 'Use Case' : kind[0].toUpperCase() + kind.slice(1)} Diagram ${count}`, kind, views: [], relationships: [], viewport: { x: 0, y: 0, zoom: 1 } });
    });
    set({ activeDiagramId: diagramId, selection: { nodeIds: [], edgeIds: [] } });
  },

  duplicateDiagram: (diagramId) => {
    const copyId = newId('diagram');
    get().commit((project) => {
      const source = project.diagrams.find((diagram) => diagram.id === diagramId);
      if (!source) return;
      project.diagrams.push({ ...source, id: copyId, name: `${source.name} Copy`, views: source.views.map((view) => ({ ...view })), relationships: source.relationships.map((relationship) => ({ ...relationship })) });
    });
    set({ activeDiagramId: copyId, selection: { nodeIds: [], edgeIds: [] } });
  },

  renameDiagram: (diagramId, name) => get().commit((project) => {
    const diagram = project.diagrams.find((item) => item.id === diagramId);
    if (diagram) diagram.name = name || 'Untitled Diagram';
  }),

  deleteDiagram: (diagramId) => get().commit((project) => {
    if (project.diagrams.length <= 1) return;
    project.diagrams = project.diagrams.filter((diagram) => diagram.id !== diagramId);
    const nextActive = project.diagrams.find((diagram) => diagram.id === get().activeDiagramId) ?? project.diagrams[0];
    set({ activeDiagramId: nextActive.id, selection: { nodeIds: [], edgeIds: [] } });
  }),

  addElement: (kind) => {
    const { activeDiagramId } = get();
    get().commit((project) => {
      const diagram = activeDiagram(project, activeDiagramId);
      if (!diagram) return;
      const element = defaultElement(kind);
      project.model.elements[element.id] = element;
      let slot = 0;
      while (diagram.views.some((view) => {
        const candidate = defaultView(element.id, slot);
        return view.x === candidate.x && view.y === candidate.y;
      })) slot += 1;
      diagram.views.push(defaultView(element.id, slot));
    });
  },

  addElementAt: (kind, x, y) => {
    const { activeDiagramId } = get();
    get().commit((project) => {
      const diagram = activeDiagram(project, activeDiagramId);
      if (!diagram) return;
      const element = defaultElement(kind);
      project.model.elements[element.id] = element;
      diagram.views.push({ ...defaultView(element.id, diagram.views.length), x, y });
    });
  },

  updateElement: (elementId, patch) => get().commit((project) => {
    const element = project.model.elements[elementId];
    if (!element) return;
    if (patch.name !== undefined) element.name = patch.name;
    if (patch.properties) element.properties = { ...element.properties, ...patch.properties };
  }),

  updateView: (elementId, patch, recordHistory = true) => {
    const { activeDiagramId } = get();
    const update = (project: Project) => {
      const view = activeDiagram(project, activeDiagramId)?.views.find((item) => item.elementId === elementId);
      if (view) Object.assign(view, patch);
    };
    if (recordHistory) get().commit(update);
    else set((state) => { const next = cloneProject(state.project); update(next); return { project: next, dirty: true }; });
  },

  updateViewport: (viewport) => {
    const { activeDiagramId } = get();
    set((state) => {
      const project = cloneProject(state.project);
      const diagram = activeDiagram(project, activeDiagramId);
      if (diagram) diagram.viewport = viewport;
      return { project };
    });
  },

  addRelationship: (kind, sourceId, targetId) => {
    const { activeDiagramId } = get();
    get().commit((project) => {
      const diagram = activeDiagram(project, activeDiagramId);
      if (!diagram) return;
      const result = validateRelationship(project.diagrams.find((item) => item.id === diagram.id)?.kind ?? 'class', project.model.elements[sourceId], project.model.elements[targetId], kind);
      if (!result.valid) return;
      diagram.relationships.push({ id: newId('relation'), kind, sourceId, targetId });
    });
  },

  updateRelationship: (relationshipId, patch) => {
    const { activeDiagramId } = get();
    get().commit((project) => {
      const relationship = activeDiagram(project, activeDiagramId)?.relationships.find((item) => item.id === relationshipId);
      if (relationship) Object.assign(relationship, patch);
    });
  },

  deleteSelection: () => {
    const { activeDiagramId, selection } = get();
    get().commit((project) => {
      const diagram = activeDiagram(project, activeDiagramId);
      if (!diagram) return;
      const ids = new Set(selection.nodeIds);
      diagram.views = diagram.views.filter((view) => !ids.has(view.elementId));
      diagram.relationships = diagram.relationships.filter((relationship) => !selection.edgeIds.includes(relationship.id) && !ids.has(relationship.sourceId) && !ids.has(relationship.targetId));
      for (const elementId of ids) {
        const usedElsewhere = project.diagrams.some((item) => item.views.some((view) => view.elementId === elementId));
        if (!usedElsewhere) delete project.model.elements[elementId];
      }
    });
    set({ selection: { nodeIds: [], edgeIds: [] } });
  },

  duplicateSelection: () => {
    const { activeDiagramId, selection } = get();
    get().commit((project) => {
      const diagram = activeDiagram(project, activeDiagramId);
      if (!diagram) return;
      const mapping = new Map<string, string>();
      for (const view of diagram.views.filter((item) => selection.nodeIds.includes(item.elementId))) {
        const old = project.model.elements[view.elementId];
        if (!old) continue;
        const copy = { ...old, id: newId('element'), properties: { ...old.properties, attributes: [...(old.properties.attributes ?? [])], operations: [...(old.properties.operations ?? [])] } };
        project.model.elements[copy.id] = copy;
        mapping.set(old.id, copy.id);
        diagram.views.push({ ...view, elementId: copy.id, x: view.x + 30, y: view.y + 30 });
      }
      for (const relation of diagram.relationships.filter((item) => mapping.has(item.sourceId) && mapping.has(item.targetId))) {
        diagram.relationships.push({ ...relation, id: newId('relation'), sourceId: mapping.get(relation.sourceId)!, targetId: mapping.get(relation.targetId)! });
      }
    });
  },

  alignSelection: (axis) => {
    const { activeDiagramId, selection } = get();
    if (selection.nodeIds.length < 2) return;
    get().commit((project) => {
      const diagram = activeDiagram(project, activeDiagramId);
      if (!diagram) return;
      const views = diagram.views.filter((view) => selection.nodeIds.includes(view.elementId));
      if (views.length < 2) return;
      const left = Math.min(...views.map((view) => view.x));
      const right = Math.max(...views.map((view) => view.x + view.width));
      const top = Math.min(...views.map((view) => view.y));
      const bottom = Math.max(...views.map((view) => view.y + view.height));
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      for (const view of views) {
        if (axis === 'left') view.x = left;
        if (axis === 'center') view.x = centerX - view.width / 2;
        if (axis === 'right') view.x = right - view.width;
        if (axis === 'top') view.y = top;
        if (axis === 'middle') view.y = centerY - view.height / 2;
        if (axis === 'bottom') view.y = bottom - view.height;
      }
    });
  },

  distributeSelection: (axis) => {
    const { activeDiagramId, selection } = get();
    if (selection.nodeIds.length < 3) return;
    get().commit((project) => {
      const diagram = activeDiagram(project, activeDiagramId);
      if (!diagram) return;
      const views = diagram.views.filter((view) => selection.nodeIds.includes(view.elementId)).sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);
      if (views.length < 3) return;
      const first = views[0];
      const last = views[views.length - 1];
      const start = axis === 'horizontal' ? first.x : first.y;
      const end = axis === 'horizontal' ? last.x : last.y;
      const step = (end - start) / (views.length - 1);
      views.forEach((view, index) => {
        if (axis === 'horizontal') view.x = start + step * index;
        else view.y = start + step * index;
      });
    });
  },

  undo: () => {
    const { history, project, future } = get();
    const previous = history[history.length - 1];
    if (!previous) return;
    set({ project: previous, history: history.slice(0, -1), future: [project, ...future], dirty: true, selection: { nodeIds: [], edgeIds: [] } });
  },

  redo: () => {
    const { history, project, future } = get();
    const next = future[0];
    if (!next) return;
    set({ project: next, history: [...history, project].slice(-MAX_HISTORY), future: future.slice(1), dirty: true, selection: { nodeIds: [], edgeIds: [] } });
  },
}));

export function getActiveDiagram(project: Project, diagramId: string) {
  return activeDiagram(project, diagramId);
}
