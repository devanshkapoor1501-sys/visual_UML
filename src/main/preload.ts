import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('desktop', {
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (content: string, filePath?: string) => ipcRenderer.invoke('project:save', content, filePath),
  saveAutosave: (content: string) => ipcRenderer.invoke('project:autosave', content),
  loadAutosave: () => ipcRenderer.invoke('project:load-autosave'),
});
