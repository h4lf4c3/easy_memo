const { BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  global.mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    backgroundColor: '#f5f5f5',
    icon: path.join(__dirname, '../image/icon.svg'),
    ...(process.platform === 'win32' ? {
      icon: path.join(__dirname, '../icon.ico')
    } : {})
  });

  global.mainWindow.setMenu(null);
  global.mainWindow.loadFile('renderer/index.html');
  global.mainWindow.webContents.openDevTools();

  global.mainWindow.on('closed', function () {
    global.mainWindow = null;
  });
}

module.exports = { createWindow };
