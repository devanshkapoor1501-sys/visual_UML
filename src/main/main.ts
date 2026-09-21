import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';

async function createWindow() {
  const appPath = app.getAppPath();
  const window = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#f4f7fb',
    webPreferences: {
      preload: join(appPath, 'dist-electron', 'main', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    await window.loadFile(join(appPath, 'dist', 'index.html'));
  } else {
    await window.loadURL('http://127.0.0.1:5173');
  }
}

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'UML Project', extensions: ['umlproj', 'json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  return { filePath, content: await fs.readFile(filePath, 'utf8') };
});

ipcMain.handle('project:save', async (_event, content: string, existingPath?: string) => {
  let filePath = existingPath;
  if (!filePath) {
    const result = await dialog.showSaveDialog({
      defaultPath: 'Untitled.umlproj',
      filters: [{ name: 'UML Project', extensions: ['umlproj'] }],
    });
    if (result.canceled || !result.filePath) return null;
    filePath = result.filePath;
  }
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
});

ipcMain.handle('project:autosave', async (_event, content: string) => {
  const filePath = join(app.getPath('userData'), 'autosave.umlproj');
  await fs.writeFile(filePath, content, 'utf8');
  return true;
});

ipcMain.handle('project:load-autosave', async () => {
  const filePath = join(app.getPath('userData'), 'autosave.umlproj');
  if (!existsSync(filePath)) return null;
  return fs.readFile(filePath, 'utf8');
});

app.whenReady().then(async () => {
  try {
    await createWindow();
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    });
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
    await fs.mkdir(app.getPath('userData'), { recursive: true });
    await fs.writeFile(join(app.getPath('userData'), 'startup-error.log'), message, 'utf8');
    dialog.showErrorBox('UML Studio could not start', message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
