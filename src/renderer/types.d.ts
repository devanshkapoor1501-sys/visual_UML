import type { Project } from '../shared/model';

declare global {
  interface Window {
    desktop?: {
      openProject: () => Promise<{ filePath: string; content: string } | null>;
      saveProject: (content: string, filePath?: string) => Promise<string | null>;
      saveAutosave: (content: string) => Promise<boolean>;
      loadAutosave: () => Promise<string | null>;
    };
  }
}

export type OpenProjectResult = { filePath: string; content: string };
export type ProjectForWindow = Project;

