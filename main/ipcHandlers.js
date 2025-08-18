const { ipcMain } = require('electron');
const store = require('./store');
const { exportData, importData } = require('./fileService');

// 计算项目的超期任务数
function calculateOverdueTasks(projectId) {
  const tasks = store.get(`tasks.${projectId}`, []);
  const now = new Date();
  
  return tasks.filter(task => {
    if (task.completed) return false; // 已完成的任务不算超期
    if (!task.dueDate) return false; // 没有截止日期的任务不算超期
    
    const dueDate = new Date(task.dueDate);
    return dueDate < now; // 截止日期已过的未完成任务
  }).length;
}

function registerIpcHandlers() {
  // 项目
  ipcMain.on('load-projects', (event) => {
    const projects = store.get('projects', []);
    
    // 为每个项目计算超期任务数
    const projectsWithOverdue = projects.map(project => ({
      ...project,
      overdueCount: calculateOverdueTasks(project.id)
    }));
    
    event.reply('projects-loaded', projectsWithOverdue);
  });

  ipcMain.on('save-project', (event, project) => {
    let projects = store.get('projects', []);
    const index = projects.findIndex(p => p.id === project.id);

    if (index !== -1) {
      projects[index] = project;
    } else {
      project.id = Date.now().toString();
      project.createdAt = new Date().toISOString();
      project.updatedAt = new Date().toISOString();
      project.completedCount = 0;
      project.pendingCount = 0;
      projects.push(project);
    }

    store.set('projects', projects);
    event.reply('project-saved', project);
  });

  ipcMain.on('delete-project', (event, projectId) => {
    let projects = store.get('projects', []);
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects.splice(index, 1);
      store.set('projects', projects);
      store.delete(`tasks.${projectId}`);
      event.reply('project-deleted', projectId);
    }
  });

  // 任务
  ipcMain.on('load-tasks', (event, projectId) => {
    const tasks = store.get(`tasks.${projectId}`, []);
    event.reply('tasks-loaded', tasks);
  });

  ipcMain.on('save-task', (event, { projectId, task }) => {
    let tasks = store.get(`tasks.${projectId}`, []);
    let projects = store.get('projects', []);
    const projectIndex = projects.findIndex(p => p.id === projectId);
    const index = tasks.findIndex(t => t.id === task.id);

    if (index !== -1) {
      const oldCompleted = tasks[index].completed;
      tasks[index] = task;
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
      task.id = Date.now().toString();
      task.createdAt = new Date().toISOString();
      tasks.push(task);
      if (projectIndex !== -1) {
        projects[projectIndex].pendingCount++;
        projects[projectIndex].updatedAt = new Date().toISOString();
      }
    }

    store.set(`tasks.${projectId}`, tasks);
    store.set('projects', projects);

    event.reply('task-saved', task);
    if (projectIndex !== -1) {
      // 更新超期任务数
      projects[projectIndex].overdueCount = calculateOverdueTasks(projectId);
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
      if (projectIndex !== -1) {
        // 更新超期任务数
        projects[projectIndex].overdueCount = calculateOverdueTasks(projectId);
        event.reply('project-updated', projects[projectIndex]);
      }
    }
  });

  // 导入导出
  ipcMain.on('export-data', exportData);
  ipcMain.on('import-data', importData);
}

module.exports = registerIpcHandlers;
