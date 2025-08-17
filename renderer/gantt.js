// 甘特图模块
// 负责甘特图的渲染和交互功能

class GanttChart {
  constructor() {
    this.ganttInstance = null;
    this.currentTasks = [];
    this.currentProjectId = null;
    this.ipcRenderer = null;
    this.currentTimeScale = 'month'; // 默认时间粒度为月
  }

  // 初始化甘特图模块
  init(ipcRenderer) {
    this.ipcRenderer = ipcRenderer;
  }

  // 设置当前项目ID
  setCurrentProjectId(projectId) {
    this.currentProjectId = projectId;
  }

  // 设置当前任务列表
  setCurrentTasks(tasks) {
    this.currentTasks = tasks;
  }

  // 设置时间粒度
  setTimeScale(timeScale) {
    this.currentTimeScale = timeScale;
  }

  // 获取时间轴配置
  getTimelineConfig(timeScale) {
    const configs = {
      week: {
        colWidth: 60,
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
            unit: 'week',
            step: 1,
            format(date) {
              const startDate = new Date(date.startDate);
              const endDate = new Date(date.endDate);
              return `${startDate.getMonth() + 1}/${startDate.getDate()}-${endDate.getMonth() + 1}/${endDate.getDate()}`;
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
      month: {
        colWidth: 80,
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
      quarter: {
        colWidth: 120,
        scales: [
          {
            unit: 'year',
            step: 1,
            format(date) {
              const startDate = new Date(date.startDate);
              return `${startDate.getFullYear()}年`;
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
            unit: 'quarter',
            step: 1,
            format(date) {
              const startDate = new Date(date.startDate);
              const quarter = Math.floor(startDate.getMonth() / 3) + 1;
              return `Q${quarter}`;
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
      year: {
        colWidth: 150,
        scales: [
          {
            unit: 'year',
            step: 1,
            format(date) {
              const startDate = new Date(date.startDate);
              return `${startDate.getFullYear()}年`;
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
            unit: 'month',
            step: 1,
            format(date) {
              const startDate = new Date(date.startDate);
              return `${startDate.getMonth() + 1}月`;
            },
            style: {
              fontSize: 12,
              color: '#666',
              textAlign: 'center',
              backgroundColor: '#f8f9fa'
            }
          }
        ]
      }
    };
    
    return configs[timeScale] || configs.month;
  }

  // 渲染甘特图
  render(tasks, onTaskEdit, retryCount = 0) {
    const ganttContainer = document.getElementById('gantt-container');
    
    if (tasks.length === 0) {
      ganttContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">暂无任务</div>';
      return;
    }
    
    // 确保容器可见且有正确的尺寸
    if (ganttContainer.offsetWidth === 0 || ganttContainer.offsetHeight === 0) {
      // 如果容器不可见，延迟初始化，最多重试5次
      if (retryCount < 5) {
        setTimeout(() => {
          this.render(tasks, onTaskEdit, retryCount + 1);
        }, 100 * (retryCount + 1)); // 递增延迟时间
      } else {
        console.error('甘特图容器初始化失败：容器尺寸为0');
        ganttContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">甘特图容器初始化失败</div>';
      }
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
        width: 60,
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
        width: 400,
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
        ...this.getTimelineConfig(this.currentTimeScale),
        backgroundColor: '#f8f9fa',
        horizontalLine: {
          lineWidth: 1,
          lineColor: '#e1e4e8'
        },
        verticalLine: {
          lineWidth: 1,
          lineColor: '#e1e4e8'
        }
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
    if (this.ganttInstance) {
      this.ganttInstance.release();
    }
    
    // 检查 VTableGantt 是否已加载
    if (typeof VTableGantt === 'undefined') {
      console.error('VTableGantt 库未加载');
      ganttContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">甘特图库加载失败</div>';
      return;
    }
    
    try {
      // 创建新的甘特图实例
      this.ganttInstance = new VTableGantt.Gantt(ganttContainer, option);      
      // 绑定事件
      this.bindEvents(tasks, onTaskEdit);
    } catch (error) {
      console.error('甘特图初始化失败:', error);
      console.error('错误堆栈:', error.stack);
      ganttContainer.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">甘特图初始化失败: ' + error.message + '</div>';
    }
  }

  // 绑定甘特图事件
  bindEvents(tasks, onTaskEdit) {
    if (!this.ganttInstance) return;

    // 监听任务条双击事件
    this.ganttInstance.on('DBLCLICK_CELL', (args) => {
      if (args.targetIcon) return; // 忽略图标点击
      
      const record = args.record;
      if (record && record.id) {
        const task = tasks.find(t => t.id === record.id);
        if (task && onTaskEdit) {
          onTaskEdit(task);
        }
      }
    });
    
    // 监听任务条拖拽事件 - 移动任务
    this.ganttInstance.on('change_date_range', (args) => {
      this.handleTaskDateChange(args, tasks);
    });
    
    // 监听任务条调整大小事件 - 调整任务持续时间
    this.ganttInstance.on('resize_task_bar', (args) => {
      this.handleTaskDateChange(args, tasks);
    });
  }

  // 处理任务日期变更
  handleTaskDateChange(args, tasks) {
    const { record, startDate, endDate } = args;
    const task = tasks.find(t => t.id === record.id);
    if (task && this.ipcRenderer && this.currentProjectId) {
      // 格式化日期为 YYYY-MM-DD 格式
      const formatDate = (date) => {
        if (typeof date === 'string') return date.split('T')[0];
        return date.toISOString().split('T')[0];
      };
      
      // 更新任务的开始和结束时间
      task.startDate = formatDate(startDate);
      task.dueDate = formatDate(endDate);
      
      // 更新当前任务列表中的数据
      const taskIndex = this.currentTasks.findIndex(t => t.id === task.id);
      if (taskIndex !== -1) {
        this.currentTasks[taskIndex] = { ...task };
      }
      
      // 保存到后端
      this.ipcRenderer.send('save-task', { projectId: this.currentProjectId, task });
      
      // 触发自定义事件，通知主模块更新表格视图
      const event = new CustomEvent('gantt-task-updated', {
        detail: { task, tasks: this.currentTasks }
      });
      document.dispatchEvent(event);
    }
  }

  // 销毁甘特图实例
  destroy() {
    if (this.ganttInstance) {
      try {
        this.ganttInstance.release();
      } catch (error) {
        console.warn('甘特图实例销毁时出现警告:', error);
      }
      this.ganttInstance = null;
    }
  }
}

// 创建全局甘特图实例
const ganttChart = new GanttChart();

// 导出甘特图实例
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ganttChart;
} else {
  window.ganttChart = ganttChart;
}