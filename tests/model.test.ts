import { describe, expect, it } from 'vitest';
import { createEmptyProject, defaultElement, diagramElementKinds, validateRelationship } from '../src/shared/model';
import { deserializeProject, serializeProject } from '../src/shared/serialization';
import { useProjectStore } from '../src/renderer/store/useProjectStore';

describe('UML model', () => {
  it('creates a usable project with one class diagram', () => {
    const project = createEmptyProject();
    expect(project.diagrams).toHaveLength(1);
    expect(project.diagrams[0].kind).toBe('class');
    expect(project.schemaVersion).toBe(1);
  });

  it('round-trips readable project JSON', () => {
    const project = createEmptyProject('Round Trip');
    const element = defaultElement('class');
    project.model.elements[element.id] = element;
    project.diagrams[0].views.push({ elementId: element.id, x: 20, y: 30, width: 180, height: 120 });
    const restored = deserializeProject(serializeProject(project));
    expect(restored.name).toBe('Round Trip');
    expect(restored.model.elements[element.id].name).toBe('Class');
    expect(restored.diagrams[0].views[0].elementId).toBe(element.id);
  });

  it('exposes diagram-specific palette primitives', () => {
    expect(diagramElementKinds('use-case')).toContain('actor');
    expect(diagramElementKinds('sequence')).toContain('lifeline');
    expect(diagramElementKinds('activity')).toContain('decision');
  });

  it('validates typed relationships', () => {
    const source = defaultElement('class');
    const target = defaultElement('class');
    expect(validateRelationship('class', source, target, 'generalization').valid).toBe(true);
    expect(validateRelationship('class', source, source, 'association').valid).toBe(false);
    const actor = defaultElement('actor');
    expect(validateRelationship('sequence', actor, target, 'message').valid).toBe(true);
  });

  it('restores relationships with redo', () => {
    const store = useProjectStore;
    store.getState().newProject();
    store.getState().addElement('class');
    store.getState().addElement('class');
    const current = store.getState().project;
    const [sourceId, targetId] = current.diagrams[0].views.map((view) => view.elementId);
    store.getState().addRelationship('association', sourceId, targetId);
    expect(store.getState().project.diagrams[0].relationships).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().project.diagrams[0].relationships).toHaveLength(0);
    store.getState().redo();
    expect(store.getState().project.diagrams[0].relationships).toHaveLength(1);
  });

  it('activates a diagram immediately after creating it', () => {
    const store = useProjectStore;
    store.getState().newProject();
    store.getState().addDiagram('sequence');
    const state = store.getState();
    expect(state.project.diagrams.find((diagram) => diagram.id === state.activeDiagramId)?.kind).toBe('sequence');
  });

  it('reuses the first free layout slot after deleting an element', () => {
    const store = useProjectStore;
    store.getState().newProject();
    store.getState().addElement('class');
    store.getState().addElement('class');
    const firstId = store.getState().project.diagrams[0].views[0].elementId;
    store.getState().setSelection({ nodeIds: [firstId], edgeIds: [] });
    store.getState().deleteSelection();
    store.getState().addElement('class');

    const views = store.getState().project.diagrams[0].views;
    expect(views).toHaveLength(2);
    expect(new Set(views.map((view) => `${view.x}:${view.y}`)).size).toBe(2);
    expect(views.map((view) => `${view.x}:${view.y}`)).toContain('100:80');
  });
});
