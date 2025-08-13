const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');

// 初始化配置存储
const store = new Store();

// 保持对window对象的全局引用，避免JavaScript对象被垃圾回收时，窗口被自动关闭
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    frame: true,
    backgroundColor: '#f5f5f5',
    icon: path.join(__dirname, 'icon.svg')
  });
  
  // 移除菜单栏
  mainWindow.setMenu(null);

  // 加载应用的index.html
  mainWindow.loadFile('index.html');

  // 打开开发者工具
  // mainWindow.webContents.openDevTools();

  // 当window被关闭时，触发下面的事件
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 在macOS上，除非用户用Cmd + Q确定地退出，否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，通常在应用程序中重新创建一个窗口
  if (mainWindow === null) createWindow();
});

// 在这里可以包含应用程序的其余代码

// IPC通信处理
ipcMain.on('load-projects', (event) => {
  // 从存储中获取项目列表
  const projects = store.get('projects', []);
  event.reply('projects-loaded', projects);
});

ipcMain.on('save-project', (event, project) => {
  let projects = store.get('projects', []);
  
  // 检查是否是更新现有项目
  const index = projects.findIndex(p => p.id === project.id);
  
  if (index !== -1) {
    // 更新现有项目
    projects[index] = project;
  } else {
    // 添加新项目
    project.id = Date.now().toString(); // 简单的ID生成
    project.createdAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();
    project.completedCount = 0;
    project.pendingCount = 0;
    projects.push(project);
  }
  
  store.set('projects', projects);
  event.reply('project-saved', project);
});

ipcMain.on('load-tasks', (event, projectId) => {
  // 从存储中获取特定项目的任务列表
  const tasks = store.get(`tasks.${projectId}`, []);
  event.reply('tasks-loaded', tasks);
});

ipcMain.on('save-task', (event, { projectId, task }) => {
  let tasks = store.get(`tasks.${projectId}`, []);
  let projects = store.get('projects', []);
  const projectIndex = projects.findIndex(p => p.id === projectId);
  
  // 检查是否是更新现有任务
  const index = tasks.findIndex(t => t.id === task.id);
  
  if (index !== -1) {
    // 更新现有任务
    const oldCompleted = tasks[index].completed;
    tasks[index] = task;
    
    // 更新项目的完成/未完成计数
    if (oldCompleted !== task.completed && projectIndex !== -1) {
      if (task.completed) {
        projects[projectIndex].completedCount++;
        projects[projectIndex].pendingCount--;
      } else {
        projects[projectIndex].completedCount--;
        projects[projectIndex].pendingCount++;
      }
    }
  } else {
    // 添加新任务
    task.id = Date.now().toString(); // 简单的ID生成
    task.createdAt = new Date().toISOString();
    tasks.push(task);
    
    // 更新项目的未完成计数
    if (projectIndex !== -1) {
      projects[projectIndex].pendingCount++;
      projects[projectIndex].updatedAt = new Date().toISOString();
    }
  }
  
  store.set(`tasks.${projectId}`, tasks);
  store.set('projects', projects);
  
  event.reply('task-saved', task);
  // 同时返回更新后的项目信息
  if (projectIndex !== -1) {
    event.reply('project-updated', projects[projectIndex]);
  }
});

ipcMain.on('delete-task', (event, { projectId, taskId }) => {
  let tasks = store.get(`tasks.${projectId}`, []);
  let projects = store.get('projects', []);
  const projectIndex = projects.findIndex(p => p.id === projectId);
  
  const taskIndex = tasks.findIndex(t => t.id === taskId);
  if (taskIndex !== -1) {
    const task = tasks[taskIndex];
    tasks.splice(taskIndex, 1);
    
    // 更新项目的完成/未完成计数
    if (projectIndex !== -1) {
      if (task.completed) {
        projects[projectIndex].completedCount--;
      } else {
        projects[projectIndex].pendingCount--;
      }
      projects[projectIndex].updatedAt = new Date().toISOString();
    }
    
    store.set(`tasks.${projectId}`, tasks);
    store.set('projects', projects);
    
    event.reply('task-deleted', taskId);
    // 同时返回更新后的项目信息
    if (projectIndex !== -1) {
      event.reply('project-updated', projects[projectIndex]);
    }
  }
});

ipcMain.on('delete-project', (event, projectId) => {
  let projects = store.get('projects', []);
  const index = projects.findIndex(p => p.id === projectId);
  
  if (index !== -1) {
    projects.splice(index, 1);
    store.set('projects', projects);
    
    // 删除相关的任务
    store.delete(`tasks.${projectId}`);
    
    event.reply('project-deleted', projectId);
  }
});

// 导出数据
ipcMain.on('export-data', async (event) => {
  try {
    // 获取所有数据
    const projects = store.get('projects', []);
    const allData = { projects: projects, tasks: {} };
    
    // 获取每个项目的任务
    for (const project of projects) {
      allData.tasks[project.id] = store.get(`tasks.${project.id}`, []);
    }
    
    // 打开保存对话框
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: path.join(app.getPath('documents'), 'memo-data.json'),
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    
    if (!canceled && filePath) {
      // 将数据写入文件
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf-8');
      event.reply('export-data-result', { success: true, message: '数据导出成功！' });
    } else {
      event.reply('export-data-result', { success: false, message: '导出已取消' });
    }
  } catch (error) {
    console.error('导出数据错误:', error);
    event.reply('export-data-result', { success: false, message: `导出失败: ${error.message}` });
  }
});

// 导入数据
ipcMain.on('import-data', async (event) => {
  try {
    // 打开文件选择对话框
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '导入数据',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });
    
    if (!canceled && filePaths.length > 0) {
      // 读取文件内容
      const fileData = fs.readFileSync(filePaths[0], 'utf-8');
      const importedData = JSON.parse(fileData);
      
      // 验证导入的数据格式
      if (!importedData.projects || !importedData.tasks) {
        throw new Error('导入的数据格式不正确');
      }
      
      // 导入项目和任务数据
      store.set('projects', importedData.projects);
      
      // 导入每个项目的任务
      for (const projectId in importedData.tasks) {
        store.set(`tasks.${projectId}`, importedData.tasks[projectId]);
      }
      
      event.reply('import-data-result', { success: true, message: '数据导入成功！' });
      // 通知前端刷新数据
      event.reply('data-imported');
    } else {
      event.reply('import-data-result', { success: false, message: '导入已取消' });
    }
  } catch (error) {
    console.error('导入数据错误:', error);
    event.reply('import-data-result', { success: false, message: `导入失败: ${error.message}` });
  }
});