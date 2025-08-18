// 引入Electron的ipcRenderer模块用于进程间通信
const { ipcRenderer } = require('electron');

// DOM元素
const projectView = document.getElementById('project-view');
const taskView = document.getElementById('task-view');
const projectsList = document.getElementById('projects-list');
const tasksList = document.getElementById('tasks-list');
const currentProjectName = document.getElementById('current-project-name');
const tableView = document.getElementById('table-view');
const ganttView = document.getElementById('gantt-view');

// 按钮
const addProjectBtn = document.getElementById('add-project-btn');
const backToProjectsBtn = document.getElementById('back-to-projects-btn');
const addTaskBtn = document.getElementById('add-task-btn');
const toggleGanttViewBtn = document.getElementById('toggle-gantt-view-btn');
const settingsBtn = document.getElementById('settings-btn');
const themeBtn = document.getElementById('theme-btn');
const importDataBtn = document.getElementById('import-data-btn');
const exportDataBtn = document.getElementById('export-data-btn');
const settingsDropdown = document.getElementById('settings-dropdown');

// 模态框
const projectModal = document.getElementById('project-modal');
const taskModal = document.getElementById('task-modal');
const themeModal = document.getElementById('theme-modal');
const projectForm = document.getElementById('project-form');
const taskForm = document.getElementById('task-form');

// 关闭按钮
const closeButtons = document.querySelectorAll('.close, .cancel-btn');

// 当前选中的项目ID
let currentProjectId = null;
// 当前视图模式：table 或 gantt
let currentViewMode = 'table';
// 存储当前项目的任务列表
let currentTasks = [];

// 初始化：加载项目列表
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();
  
  // 设置按钮点击事件
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsDropdown.classList.toggle('show');
  });
  
  // 点击其他地方关闭下拉菜单
  document.addEventListener('click', () => {
    settingsDropdown.classList.remove('show');
  });
  
  // 防止点击下拉菜单内部时关闭菜单
  settingsDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // 切换甘特图视图按钮点击事件
  toggleGanttViewBtn.addEventListener('click', () => {
    if (currentViewMode === 'table') {
      // 切换到甘特图视图
      tableView.classList.remove('active');
      ganttView.classList.add('active');
      toggleGanttViewBtn.textContent = '表格视图';
      currentViewMode = 'gantt';
      renderGanttChart(currentTasks);
    } else {
      // 切换到表格视图
      ganttView.classList.remove('active');
      tableView.classList.add('active');
      toggleGanttViewBtn.textContent = '甘特图视图';
      currentViewMode = 'table';
    }
  });
  
  // 监听甘特图模块的任务更新事件
  document.addEventListener('gantt-task-updated', (event) => {
    const { task, tasks } = event.detail;
    currentTasks = tasks;
    
    // 如果当前在表格视图，重新渲染表格
    if (currentViewMode === 'table') {
      renderTasks(currentTasks);
    }
  });
  
  // 时间粒度切换事件
  const timeScaleSelect = document.getElementById('time-scale-select');
  if (timeScaleSelect) {
    timeScaleSelect.addEventListener('change', (e) => {
      const selectedTimeScale = e.target.value;
      // 设置甘特图的时间粒度
      ganttChart.setTimeScale(selectedTimeScale);
      // 如果当前在甘特图视图，重新渲染甘特图
      if (currentViewMode === 'gantt' && currentTasks.length > 0) {
        renderGanttChart(currentTasks);
      }
    });
  }
});

// 加载项目列表
function loadProjects() {
  ipcRenderer.send('load-projects');
}

// 接收项目列表数据
ipcRenderer.on('projects-loaded', (event, projects) => {
  renderProjects(projects);
});

// 渲染项目列表
function renderProjects(projects) {
  projectsList.innerHTML = '';
  
  projects.forEach((project, index) => {
    const row = document.createElement('tr');
    
    // 格式化日期
    const createdDate = new Date(project.createdAt).toLocaleString();
    const updatedDate = new Date(project.updatedAt).toLocaleString();
    const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString() : '未设置';
    const endDate = project.endDate ? new Date(project.endDate).toLocaleDateString() : '未设置';
    
    row.classList.add('project-row');
    row.setAttribute('data-id', project.id);
    row.setAttribute('data-name', project.name);
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td class="project-name">${project.name}</td>
      <td>${startDate}</td>
      <td>${endDate}</td>
      <td>${updatedDate}</td>
      <td>${project.completedCount}</td>
      <td>${project.pendingCount}</td>
      <td class="overdue-count">${project.overdueCount || 0}</td>
      <td>
        <button class="edit-btn" data-id="${project.id}">编辑</button>
        <button class="delete-btn" data-id="${project.id}">删除</button>
      </td>
    `;
    
    projectsList.appendChild(row);
  });
  
  // 添加项目行点击事件
  document.querySelectorAll('.project-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // 如果点击的是按钮，不触发行点击事件
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
        return;
      }
      const projectId = row.getAttribute('data-id');
      const projectName = row.getAttribute('data-name');
      openTaskView(projectId, projectName);
    });
  });
  
  // 添加编辑按钮点击事件
  document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const projectId = button.getAttribute('data-id');
      const project = projects.find(p => p.id === projectId);
      openProjectModal(project);
    });
  });
  
  // 添加删除按钮点击事件
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const projectId = button.getAttribute('data-id');
      if (confirm('确定要删除这个项目吗？所有相关任务也将被删除。')) {
        ipcRenderer.send('delete-project', projectId);
      }
    });
  });
}

// 打开任务视图
function openTaskView(projectId, projectName) {
  currentProjectId = projectId;
  currentProjectName.textContent = projectName;
  
  projectView.classList.remove('active');
  taskView.classList.add('active');
  
  loadTasks(projectId);
}

// 加载任务列表
function loadTasks(projectId) {
  ipcRenderer.send('load-tasks', projectId);
}

// 接收任务列表数据
ipcRenderer.on('tasks-loaded', (event, tasks) => {
  currentTasks = tasks;
  renderTasks(tasks);
  if (currentViewMode === 'gantt') {
    renderGanttChart(tasks);
  }
});

// 渲染任务列表
function renderTasks(tasks) {
  tasksList.innerHTML = '';
  
  tasks.forEach((task, index) => {
    const row = document.createElement('tr');
    
    // 格式化日期
    const createdDate = new Date(task.createdAt).toLocaleString();
    const startDate = task.startDate ? new Date(task.startDate).toLocaleDateString() : '未设置';
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '未设置';
    
    // 设置优先级和完成状态的样式类
    const priorityClass = `priority-${task.priority === '高' ? 'high' : task.priority === '中' ? 'medium' : 'low'}`;
    const statusClass = task.completed ? 'status-completed' : 'status-pending';
    
    // 判断任务是否超期
    const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date();
    const overdueIcon = isOverdue ? '<span class="overdue-icon" title="任务已超期">⚠</span>' : '';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td title="${task.content}">${task.name || task.content}</td>
      <td>${createdDate}</td>
      <td class="${priorityClass}">${task.priority}</td>
      <td>${startDate}</td>
      <td>${dueDate}</td>
      <td class="${statusClass}">${task.completed ? '已完成' : '未完成'}</td>
      <td class="overdue-status">${overdueIcon}</td>
      <td>
        <button class="edit-btn" data-id="${task.id}">编辑</button>
        <button class="delete-btn" data-id="${task.id}">删除</button>
      </td>
    `;
    
    tasksList.appendChild(row);
  });
  
  // 添加编辑按钮点击事件
  document.querySelectorAll('#tasks-list .edit-btn').forEach(button => {
    button.addEventListener('click', () => {
      const taskId = button.getAttribute('data-id');
      const task = tasks.find(t => t.id === taskId);
      openTaskModal(task);
    });
  });
  
  // 添加删除按钮点击事件
  document.querySelectorAll('#tasks-list .delete-btn').forEach(button => {
    button.addEventListener('click', () => {
      const taskId = button.getAttribute('data-id');
      if (confirm('确定要删除这个任务吗？')) {
        ipcRenderer.send('delete-task', { projectId: currentProjectId, taskId });
      }
    });
  });
}

// 返回项目列表视图
backToProjectsBtn.addEventListener('click', () => {
  taskView.classList.remove('active');
  projectView.classList.add('active');
  currentProjectId = null;
  loadProjects(); // 刷新项目列表
});

// 添加项目按钮点击事件
addProjectBtn.addEventListener('click', () => {
  openProjectModal();
});

// 添加任务按钮点击事件
addTaskBtn.addEventListener('click', () => {
  openTaskModal();
});

// 打开项目模态框
function openProjectModal(project = null) {
  const projectIdInput = document.getElementById('project-id');
  const projectNameInput = document.getElementById('project-name');
  const projectStartDateInput = document.getElementById('project-start-date');
  const projectEndDateInput = document.getElementById('project-end-date');
  
  if (project) {
    // 编辑模式
    projectIdInput.value = project.id;
    projectNameInput.value = project.name;
    projectStartDateInput.value = project.startDate || '';
    projectEndDateInput.value = project.endDate || '';
  } else {
    // 添加模式
    projectIdInput.value = '';
    projectNameInput.value = '';
    projectStartDateInput.value = '';
    projectEndDateInput.value = '';
  }
  
  projectModal.style.display = 'block';
}

// 打开任务模态框
function openTaskModal(task = null) {
  const taskIdInput = document.getElementById('task-id');
  const taskNameInput = document.getElementById('task-name');
  const taskContentInput = document.getElementById('task-content');
  const taskPriorityInput = document.getElementById('task-priority');
  const taskStartDateInput = document.getElementById('task-start-date');
  const taskDueDateInput = document.getElementById('task-due-date');
  const taskCompletedInput = document.getElementById('task-completed');
  
  // 获取或创建createdAt隐藏字段
  let taskCreatedAtInput = document.getElementById('task-created-at');
  if (!taskCreatedAtInput) {
    taskCreatedAtInput = document.createElement('input');
    taskCreatedAtInput.type = 'hidden';
    taskCreatedAtInput.id = 'task-created-at';
    document.getElementById('task-form').appendChild(taskCreatedAtInput);
  }
  
  if (task) {
    // 编辑模式
    taskIdInput.value = task.id;
    taskNameInput.value = task.name || task.content; // 兼容旧数据
    taskContentInput.value = task.content;
    taskPriorityInput.value = task.priority;
    taskStartDateInput.value = task.startDate ? task.startDate.split('T')[0] : '';
    taskDueDateInput.value = task.dueDate ? task.dueDate.split('T')[0] : '';
    taskCompletedInput.value = task.completed.toString();
    taskCreatedAtInput.value = task.createdAt || new Date().toISOString();
  } else {
    // 添加模式
    taskIdInput.value = '';
    taskNameInput.value = '';
    taskContentInput.value = '';
    taskPriorityInput.value = '中';
    taskStartDateInput.value = '';
    taskDueDateInput.value = '';
    taskCompletedInput.value = 'false';
    taskCreatedAtInput.value = '';
  }
  
  // 确保textarea可编辑
  setTimeout(() => {
    taskContentInput.focus();
    taskContentInput.disabled = false;
    taskContentInput.readOnly = false;
  }, 100);
  
  taskModal.style.display = 'block';
}

// 关闭模态框
closeButtons.forEach(button => {
  button.addEventListener('click', () => {
    projectModal.style.display = 'none';
    taskModal.style.display = 'none';
    themeModal.style.display = 'none';
  });
});

// 点击模态框外部关闭模态框（任务模态框除外）
window.addEventListener('click', (event) => {
  if (event.target === projectModal) {
    projectModal.style.display = 'none';
  }
  // 移除任务模态框的外部点击关闭功能，防止编辑时意外关闭
  // if (event.target === taskModal) {
  //   taskModal.style.display = 'none';
  // }
  if (event.target === themeModal) {
    themeModal.style.display = 'none';
  }
});

// 提交项目表单
projectForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const projectId = document.getElementById('project-id').value;
  const projectName = document.getElementById('project-name').value;
  const projectStartDate = document.getElementById('project-start-date').value;
  const projectEndDate = document.getElementById('project-end-date').value;
  
  const project = {
    id: projectId,
    name: projectName,
    startDate: projectStartDate,
    endDate: projectEndDate
  };
  
  ipcRenderer.send('save-project', project);
  projectModal.style.display = 'none';
});

// 提交任务表单
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const taskId = document.getElementById('task-id').value;
  const taskName = document.getElementById('task-name').value;
  const taskContent = document.getElementById('task-content').value;
  const taskPriority = document.getElementById('task-priority').value;
  const taskStartDate = document.getElementById('task-start-date').value;
  const taskDueDate = document.getElementById('task-due-date').value;
  const taskCompleted = document.getElementById('task-completed').value === 'true';
  const taskCreatedAt = document.getElementById('task-created-at').value;
  
  const task = {
    id: taskId,
    name: taskName,
    content: taskContent,
    priority: taskPriority,
    startDate: taskStartDate,
    dueDate: taskDueDate,
    completed: taskCompleted,
    createdAt: taskCreatedAt
  };
  
  ipcRenderer.send('save-task', { projectId: currentProjectId, task });
  taskModal.style.display = 'none';
});

// 接收保存项目的响应
ipcRenderer.on('project-saved', (event, project) => {
  loadProjects();
});

// 接收保存任务的响应
ipcRenderer.on('task-saved', (event, task) => {
  loadTasks(currentProjectId);
});

// 渲染甘特图 - 使用分离的甘特图模块
function renderGanttChart(tasks) {
  // 初始化甘特图模块
  ganttChart.init(ipcRenderer);
  ganttChart.setCurrentProjectId(currentProjectId);
  ganttChart.setCurrentTasks(currentTasks);
  
  // 确保甘特图容器已经显示后再渲染
  setTimeout(() => {
    console.log('开始渲染甘特图，任务数量:', tasks.length);
    ganttChart.render(tasks, openTaskModal);
  }, 200);
}



// 接收删除项目的响应
ipcRenderer.on('project-deleted', (event, projectId) => {
  loadProjects();
});

// 接收删除任务的响应
ipcRenderer.on('task-deleted', (event, taskId) => {
  loadTasks(currentProjectId);
});

// 任务表单提交处理已在上面的事件监听器中完成

// 接收项目更新的响应
ipcRenderer.on('project-updated', (event, project) => {
  // 如果当前在项目列表视图，刷新项目列表
  if (projectView.classList.contains('active')) {
    loadProjects();
  }
});

// 导出数据按钮点击事件
exportDataBtn.addEventListener('click', () => {
  ipcRenderer.send('export-data');
});

// 导入数据按钮点击事件
importDataBtn.addEventListener('click', () => {
  if (confirm('导入数据将覆盖当前所有数据，确定要继续吗？')) {
    ipcRenderer.send('import-data');
  }
});

// 接收导出数据结果
ipcRenderer.on('export-data-result', (event, result) => {
  alert(result.message);
});

// 接收导入数据结果
ipcRenderer.on('import-data-result', (event, result) => {
  alert(result.message);
});

// 接收数据导入完成通知
ipcRenderer.on('data-imported', () => {
  // 刷新项目列表
  loadProjects();
});

// 主题功能
themeBtn.addEventListener('click', () => {
  settingsDropdown.classList.remove('show');
  themeModal.style.display = 'block';
  loadCurrentTheme();
});

// 加载当前主题
function loadCurrentTheme() {
  const currentTheme = localStorage.getItem('app-theme') || 'default';
  const themeOptions = document.querySelectorAll('.theme-option');
  
  themeOptions.forEach(option => {
    option.classList.remove('active');
    if (option.dataset.theme === currentTheme) {
      option.classList.add('active');
    }
  });
}

// 主题选择事件
document.querySelectorAll('.theme-option').forEach(option => {
  option.addEventListener('click', () => {
    const theme = option.dataset.theme;
    applyTheme(theme);
    
    // 更新选中状态
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.classList.remove('active');
    });
    option.classList.add('active');
    
    // 保存主题设置
    localStorage.setItem('app-theme', theme);
    
    // 关闭模态框
    setTimeout(() => {
      themeModal.style.display = 'none';
    }, 300);
  });
});

// 应用主题
function applyTheme(theme) {
  if (theme === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// 页面加载时应用保存的主题
document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('app-theme') || 'default';
  applyTheme(savedTheme);
});