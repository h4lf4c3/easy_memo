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
    const startDate = task.startDate ? new Date(task.startDate).toLocaleDateString() : '未设置';
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '未设置';
    
    // 设置优先级和完成状态的样式类
    const priorityClass = `priority-${task.priority === '高' ? 'high' : task.priority === '中' ? 'medium' : 'low'}`;
    const statusClass = task.completed ? 'status-completed' : 'status-pending';
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td title="${task.content}">${task.name || task.content}</td>
      <td>${createdDate}</td>
      <td class="${priorityClass}">${task.priority}</td>
      <td>${startDate}</td>
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
  const taskStartDateInput = document.getElementById('task-start-date');
  const taskDueDateInput = document.getElementById('task-due-date');
  const taskCompletedInput = document.getElementById('task-completed');
  
  if (task) {
    // 编辑模式
    taskIdInput.value = task.id;
    taskNameInput.value = task.name || task.content; // 兼容旧数据
    taskContentInput.value = task.content;
    taskPriorityInput.value = task.priority;
    taskStartDateInput.value = task.startDate ? task.startDate.split('T')[0] : '';
    taskDueDateInput.value = task.dueDate ? task.dueDate.split('T')[0] : '';
    taskCompletedInput.value = task.completed.toString();
  } else {
    // 添加模式
    taskIdInput.value = '';
    taskNameInput.value = '';
    taskContentInput.value = '';
    taskPriorityInput.value = '中';
    taskStartDateInput.value = '';
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
  const taskStartDate = document.getElementById('task-start-date').value;
  const taskDueDate = document.getElementById('task-due-date').value;
  const taskCompleted = document.getElementById('task-completed').value === 'true';
  
  const task = {
    id: taskId,
    name: taskName,
    content: taskContent,
    priority: taskPriority,
    startDate: taskStartDate,
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

// 全局甘特图实例
let ganttInstance = null;

// 渲染甘特图
function renderGanttChart(tasks) {
  const ganttContainer = document.getElementById('gantt-container');
  
  if (tasks.length === 0) {
    ganttContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">暂无任务</div>';
    return;
  }
  
  // 转换任务数据格式
  const records = tasks.map(task => ({
    id: task.id,
    title: task.name || task.content,
    start: task.startDate || task.createdAt.split('T')[0],
    end: task.dueDate || task.startDate || task.createdAt.split('T')[0],
    progress: task.completed ? 100 : 0,
    priority: task.priority || '低', // 为没有优先级的任务设置默认值
    content: task.content
  }));
  
  // 定义列配置
  const columns = [
    {
      field: 'title',
      title: '任务名称',
      width: 80,
      sort: true,
      editor: 'input'
    },
    {
      field: 'start',
      title: '开始时间',
      width: 80,
      sort: true,
      editor: 'date-input'
    },
    {
      field: 'end',
      title: '结束时间',
      width: 80,
      sort: true,
      editor: 'date-input'
    }
  ];
  
  // 甘特图配置
  const option = {
    overscrollBehavior: 'none',
    records,
    taskListTable: {
      columns,
      tableWidth: 350,
      minTableWidth: 200,
      maxTableWidth: 500,
      theme: {
        headerStyle: {
          borderColor: '#e1e4e8',
          borderLineWidth: [1, 0, 1, 0],
          fontSize: 14,
          fontWeight: 'bold',
          color: '#333',
          bgColor: '#f8f9fa'
        },
        bodyStyle: {
          borderColor: '#e1e4e8',
          borderLineWidth: [1, 0, 1, 0],
          fontSize: 13,
          color: '#333',
          bgColor: '#fff'
        }
      }
    },
    frame: {
      outerFrameStyle: {
        borderLineWidth: 1,
        borderColor: '#e1e4e8',
        cornerRadius: 0
      },
      verticalSplitLine: {
        lineColor: '#e1e4e8',
        lineWidth: 1,
        lineDash: []
      },
      horizontalSplitLine: {
        lineColor: '#e1e4e8',
        lineWidth: 1
      },
      verticalSplitLineMoveable: true,
      verticalSplitLineHighlight: {
        lineColor: '#007bff',
        lineWidth: 1
      }
    },
    grid: {
      verticalLine: {
        lineWidth: 1,
        lineColor: '#f0f0f0'
      },
      horizontalLine: {
        lineWidth: 1,
        lineColor: '#f0f0f0'
      }
    },
    headerRowHeight: 35,
    rowHeight: 35,
    taskBar: {
      startDateField: 'start',
      endDateField: 'end',
      progressField: 'progress',
      resizable: true,
      moveable: true,
      hoverBarStyle: {
        barOverlayColor: 'rgba(0, 123, 255, 0.2)'
      },
      labelText: '{title}',
      labelTextStyle: {
        fontFamily: 'Arial, sans-serif',
        fontSize: 12,
        textAlign: 'left',
        textOverflow: 'ellipsis',
        color: '#fff'
      },
      barStyle: {
        width: 20,
        cornerRadius: 4,
        borderLineWidth: 1,
        borderColor: '#fff'
      },
      customLayout: (args) => {
        const { width, height, taskRecord, progress } = args;
        const priority = taskRecord.priority || '低';
        const isCompleted = progress >= 100;
        
        // 根据完成状态和优先级确定颜色
        let barColor;
        if (isCompleted) {
          barColor = '#155724'; // 已完成任务使用深绿色
        } else {
          // 未完成任务根据紧急度设置颜色
          if (priority === '高') {
            barColor = '#dc3545'; // 红色
          } else if (priority === '中') {
            barColor = '#ffc107'; // 黄色
          } else {
            barColor = '#007bff'; // 蓝色
          }
        }
        
        // 创建自定义任务条
        const container = new VTableGantt.VRender.Group({
          width,
          height
        });
        
        // 背景条
        const backgroundBar = new VTableGantt.VRender.Rect({
          x: 0,
          y: (height - 20) / 2,
          width: width,
          height: 20,
          fill: '#e9ecef',
          cornerRadius: 4,
          stroke: '#fff',
          lineWidth: 1
        });
        container.add(backgroundBar);
        
        // 进度条
        const progressWidth = (width * progress) / 100;
        if (progressWidth > 0) {
          const progressBar = new VTableGantt.VRender.Rect({
            x: 0,
            y: (height - 20) / 2,
            width: progressWidth,
            height: 20,
            fill: '#28a745', // 进度条始终为绿色
            cornerRadius: 4
          });
          container.add(progressBar);
        }
        
        // 主任务条
        const taskBar = new VTableGantt.VRender.Rect({
          x: 0,
          y: (height - 20) / 2,
          width: width,
          height: 20,
          fill: barColor,
          cornerRadius: 4,
          stroke: '#fff',
          lineWidth: 1,
          fillOpacity: isCompleted ? 1 : 0.8
        });
        container.add(taskBar);
        
        return {
          rootContainer: container,
          renderDefaultBar: false,
          renderDefaultText: true
        };
      }
    },
    timelineHeader: {
      colWidth: 80,
      backgroundColor: '#f8f9fa',
      horizontalLine: {
        lineWidth: 1,
        lineColor: '#e1e4e8'
      },
      verticalLine: {
        lineWidth: 1,
        lineColor: '#e1e4e8'
      },
      scales: [
          {
            unit: 'month',
            step: 1,
            format(date) {
              const startDate = new Date(date.startDate);
              return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`;
            },
            style: {
              fontSize: 14,
              fontWeight: 'bold',
              color: '#333',
              textAlign: 'center',
              backgroundColor: '#f8f9fa'
            }
          },
          {
            unit: 'day',
            step: 1,
            format(date) {
              const startDate = new Date(date.startDate);
              return `${startDate.getMonth() + 1}/${startDate.getDate()}`;
            },
            style: {
              fontSize: 12,
              color: '#666',
              textAlign: 'center',
              backgroundColor: '#f8f9fa'
            }
          }
        ]
    },
    markLine: [
      {
        date: new Date().toISOString().split('T')[0],
        scrollToMarkLine: false,
        position: 'left',
        style: {
          lineColor: '#dc3545',
          lineWidth: 2
        }
      }
    ],
    rowSeriesNumber: {
      title: '序号',
      dragOrder: false,
      headerStyle: {
        bgColor: '#f8f9fa',
        borderColor: '#e1e4e8'
      },
      style: {
        borderColor: '#e1e4e8'
      }
    },
    scrollStyle: {
      scrollRailColor: 'rgba(0,0,0,0.1)',
      visible: 'scrolling',
      width: 8,
      scrollSliderCornerRadius: 4,
      scrollSliderColor: '#007bff'
    }
  };
  
  // 销毁之前的实例
  if (ganttInstance) {
    ganttInstance.release();
  }
  
  // 创建新的甘特图实例
  ganttInstance = new VTableGantt.Gantt(ganttContainer, option);
  
  // 监听任务条点击事件
  ganttInstance.on('click_cell', (args) => {
    if (args.targetIcon) return; // 忽略图标点击
    
    const record = args.record;
    if (record && record.id) {
      const task = tasks.find(t => t.id === record.id);
      if (task) {
        openTaskModal(task);
      }
    }
  });
  
  // 监听任务条拖拽事件
  ganttInstance.on('change_date_range', (args) => {
    const { record, startDate, endDate } = args;
    const task = tasks.find(t => t.id === record.id);
    if (task) {
      // 更新任务的开始和结束时间
      task.startDate = startDate;
      task.dueDate = endDate;
      
      // 保存到后端
      ipcRenderer.send('save-task', { projectId: currentProjectId, task });
    }
  });
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