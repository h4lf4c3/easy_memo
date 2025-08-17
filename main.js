const { app } = require('electron');
const { createWindow } = require('./main/window');
const registerIpcHandlers = require('./main/ipcHandlers');

app.setAppUserModelId('com.memo.app');

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (global.mainWindow === null) createWindow();
});
