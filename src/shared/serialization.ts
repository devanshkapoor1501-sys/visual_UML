import { CURRENT_SCHEMA_VERSION, type Project } from './model.js';

export function serializeProject(project: Project): string {
  return JSON.stringify({ ...project, schemaVersion: CURRENT_SCHEMA_VERSION }, null, 2);
}

export function deserializeProject(raw: string): Project {
  const parsed = JSON.parse(raw) as Partial<Project>;
  if (!parsed || typeof parsed !== 'object') throw new Error('The selected file is not a UML project.');
  if (!parsed.name || !Array.isArray(parsed.diagrams) || !parsed.model?.elements) {
    throw new Error('The selected file is missing required UML project data.');
  }
  return {
    id: parsed.id ?? `project-${Date.now()}`,
    name: parsed.name,
    version: parsed.version ?? 1,
    schemaVersion: parsed.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    model: parsed.model,
    diagrams: parsed.diagrams.map((diagram) => ({
      ...diagram,
      views: diagram.views ?? [],
      relationships: diagram.relationships ?? [],
      viewport: diagram.viewport ?? { x: 0, y: 0, zoom: 1 },
    })),
  };
}
