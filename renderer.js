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
const ganttTasks = document.getElementById('gantt-tasks');
const ganttHeaderScale = document.querySelector('.gantt-header-scale');

// 按钮
const addProjectBtn = document.getElementById('add-project-btn');
const backToProjectsBtn = document.getElementById('back-to-projects-btn');
const addTaskBtn = document.getElementById('add-task-btn');
const toggleGanttViewBtn = document.getElementById('toggle-gantt-view-btn');
const settingsBtn = document.getElementById('settings-btn');
const importDataBtn = document.getElementById('import-data-btn');
const exportDataBtn = document.getElementById('export-data-btn');
const settingsDropdown = document.getElementById('settings-dropdown');

// 模态框
const projectModal = document.getElementById('project-modal');
const taskModal = document.getElementById('task-modal');
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
    
    row.classList.add('project-row');
    row.setAttribute('data-id', project.id);
    row.setAttribute('data-name', project.name);
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td class="project-name">${project.name}</td>
      <td>${createdDate}</td>
      <td>${updatedDate}</td>
      <td>${project.completedCount}</td>
      <td>${project.pendingCount}</td>
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
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '未设置';
    
    // 设置优先级和完成状态的样式类
    const priorityClass = `priority-${task.priority === '高' ? 'high' : task.priority === '中' ? 'medium' : 'low'}`;
    const statusClass = task.completed ? 'status-completed' : 'status-pending';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td title="${task.content}">${task.name || task.content}</td>
      <td>${createdDate}</td>
      <td class="${priorityClass}">${task.priority}</td>
      <td>${dueDate}</td>
      <td class="${statusClass}">${task.completed ? '已完成' : '未完成'}</td>
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
  
  if (project) {
    // 编辑模式
    projectIdInput.value = project.id;
    projectNameInput.value = project.name;
  } else {
    // 添加模式
    projectIdInput.value = '';
    projectNameInput.value = '';
  }
  
  projectModal.style.display = 'block';
}

// 打开任务模态框
function openTaskModal(task = null) {
  const taskIdInput = document.getElementById('task-id');
  const taskNameInput = document.getElementById('task-name');
  const taskContentInput = document.getElementById('task-content');
  const taskPriorityInput = document.getElementById('task-priority');
  const taskDueDateInput = document.getElementById('task-due-date');
  const taskCompletedInput = document.getElementById('task-completed');
  
  if (task) {
    // 编辑模式
    taskIdInput.value = task.id;
    taskNameInput.value = task.name || task.content; // 兼容旧数据
    taskContentInput.value = task.content;
    taskPriorityInput.value = task.priority;
    taskDueDateInput.value = task.dueDate ? task.dueDate.split('T')[0] : '';
    taskCompletedInput.value = task.completed.toString();
  } else {
    // 添加模式
    taskIdInput.value = '';
    taskNameInput.value = '';
    taskContentInput.value = '';
    taskPriorityInput.value = '中';
    taskDueDateInput.value = '';
    taskCompletedInput.value = 'false';
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
  });
});

// 点击模态框外部关闭模态框
window.addEventListener('click', (event) => {
  if (event.target === projectModal) {
    projectModal.style.display = 'none';
  }
  if (event.target === taskModal) {
    taskModal.style.display = 'none';
  }
});

// 提交项目表单
projectForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const projectId = document.getElementById('project-id').value;
  const projectName = document.getElementById('project-name').value;
  
  const project = {
    id: projectId,
    name: projectName
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
  const taskDueDate = document.getElementById('task-due-date').value;
  const taskCompleted = document.getElementById('task-completed').value === 'true';
  
  const task = {
    id: taskId,
    name: taskName,
    content: taskContent,
    priority: taskPriority,
    dueDate: taskDueDate,
    completed: taskCompleted
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

// 渲染甘特图
function renderGanttChart(tasks) {
  // 清空甘特图容器
  ganttTasks.innerHTML = '';
  ganttHeaderScale.innerHTML = '';
  
  if (tasks.length === 0) {
    ganttTasks.innerHTML = '<div class="gantt-empty">暂无任务</div>';
    return;
  }
  
  // 计算日期范围
  const dates = calculateDateRange(tasks);
  const { startDate, endDate, dayCount } = dates;
  
  // 渲染日期刻度
  renderDateScale(startDate, dayCount);
  
  // 渲染任务条
  tasks.forEach((task, index) => {
    renderGanttTask(task, index, dates);
  });
  
  // 添加今日线
  addTodayLine(startDate, dayCount);
}

// 计算甘特图的日期范围
function calculateDateRange(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 默认显示从今天开始的30天
  let startDate = new Date(today);
  let endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 30);
  
  // 遍历任务，找出最早的创建日期和最晚的截止日期
  tasks.forEach(task => {
    const createdDate = new Date(task.createdAt);
    createdDate.setHours(0, 0, 0, 0);
    
    if (createdDate < startDate) {
      startDate = new Date(createdDate);
    }
    
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      if (dueDate > endDate) {
        endDate = new Date(dueDate);
        // 添加几天的缓冲
        endDate.setDate(endDate.getDate() + 5);
      }
    }
  });
  
  // 确保至少显示15天
  const dayCount = Math.max(15, getDayDifference(startDate, endDate));
  
  return { startDate, endDate, dayCount };
}

// 计算两个日期之间的天数差
function getDayDifference(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 渲染日期刻度
function renderDateScale(startDate, dayCount) {
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dayElement = document.createElement('div');
    dayElement.className = 'gantt-day';
    
    // 周末显示不同颜色
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dayElement.style.backgroundColor = '#f5f5f5';
    }
    
    // 显示日期
    dayElement.innerHTML = `${date.getMonth() + 1}/${date.getDate()}<br><small>${['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]}</small>`;
    
    ganttHeaderScale.appendChild(dayElement);
  }
}

// 渲染单个任务的甘特条
function renderGanttTask(task, index, dates) {
  const { startDate, dayCount } = dates;
  
  // 创建任务行
  const taskRow = document.createElement('div');
  taskRow.className = 'gantt-task-row';
  
  // 任务信息
  const taskInfo = document.createElement('div');
  taskInfo.className = 'gantt-task-info';
  const displayName = task.name || task.content; // 兼容旧数据
  taskInfo.textContent = displayName.length > 20 ? displayName.substring(0, 20) + '...' : displayName;
  taskInfo.title = `${task.name || task.content}\n${task.content}`;
  
  // 任务时间轴
  const taskTimeline = document.createElement('div');
  taskTimeline.className = 'gantt-task-timeline';
  
  // 为每一天创建背景网格
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const dayElement = document.createElement('div');
     dayElement.className = 'gantt-day';
     dayElement.style.height = '100%';
     dayElement.style.borderRight = '1px solid #f0f0f0';
     dayElement.style.minWidth = '60px';
    
    // 周末显示不同背景
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dayElement.style.backgroundColor = '#f9f9f9';
    }
    
    taskTimeline.appendChild(dayElement);
  }
  
  // 创建任务条
  if (task.dueDate) {
    const taskBar = document.createElement('div');
    taskBar.className = 'gantt-task-bar';
    
    // 根据优先级设置颜色
    if (task.priority === '高') {
      taskBar.classList.add('priority-high');
    } else if (task.priority === '中') {
      taskBar.classList.add('priority-medium');
    } else {
      taskBar.classList.add('priority-low');
    }
    
    // 如果任务已完成，添加完成样式
    if (task.completed) {
      taskBar.classList.add('completed');
    }
    
    // 计算任务条的位置和宽度
    const createdDate = new Date(task.createdAt);
    createdDate.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    const startDayDiff = Math.max(0, getDayDifference(startDate, createdDate));
    const taskDuration = Math.max(1, getDayDifference(createdDate, dueDate) + 1);
    
    taskBar.style.left = `${startDayDiff * 60}px`;
     taskBar.style.width = `${taskDuration * 60 - 12}px`;
    
    // 显示任务名称
    const taskDisplayName = task.name || task.content; // 兼容旧数据
    taskBar.textContent = taskDisplayName.length > 15 ? taskDisplayName.substring(0, 15) + '...' : taskDisplayName;
    taskBar.title = `任务名称: ${task.name || task.content}\n任务内容: ${task.content}\n优先级: ${task.priority}\n截止日期: ${dueDate.toLocaleDateString()}\n状态: ${task.completed ? '已完成' : '未完成'}`;
    
    // 点击任务条打开编辑模态框
    taskBar.addEventListener('click', () => {
      openTaskModal(task);
    });
    
    taskTimeline.appendChild(taskBar);
  }
  
  taskRow.appendChild(taskInfo);
  taskRow.appendChild(taskTimeline);
  ganttTasks.appendChild(taskRow);
}

// 添加今日线
function addTodayLine(startDate, dayCount) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayDiff = getDayDifference(startDate, today);
  
  // 如果今天在显示范围内
  if (dayDiff >= 0 && dayDiff < dayCount) {
    const todayLine = document.createElement('div');
    todayLine.className = 'gantt-today-line';
    todayLine.style.left = `${(dayDiff * 60) + 300}px`; // 300px是任务信息列的宽度
    
    ganttView.querySelector('.gantt-body').appendChild(todayLine);
  }
}

// 接收删除项目的响应
ipcRenderer.on('project-deleted', (event, projectId) => {
  loadProjects();
});

// 接收删除任务的响应
ipcRenderer.on('task-deleted', (event, taskId) => {
  loadTasks(currentProjectId);
});

// 当任务表单提交后，如果在甘特图视图，更新甘特图
taskForm.addEventListener('submit', () => {
  // 在loadTasks中会重新渲染甘特图
  // 这里不需要额外处理
});

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