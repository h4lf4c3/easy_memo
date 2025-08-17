const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store');

async function exportData(event) {
  try {
    const projects = store.get('projects', []);
    const allData = { projects, tasks: {} };

    for (const project of projects) {
      allData.tasks[project.id] = store.get(`tasks.${project.id}`, []);
    }

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出数据',
      defaultPath: path.join(app.getPath('documents'), 'memo-data.json'),
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (!canceled && filePath) {
      fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf-8');
      event.reply('export-data-result', { success: true, message: '数据导出成功！' });
    } else {
      event.reply('export-data-result', { success: false, message: '导出已取消' });
    }
  } catch (error) {
    console.error('导出数据错误:', error);
    event.reply('export-data-result', { success: false, message: `导出失败: ${error.message}` });
  }
}

async function importData(event) {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '导入数据',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (!canceled && filePaths.length > 0) {
      const fileData = fs.readFileSync(filePaths[0], 'utf-8');
      const importedData = JSON.parse(fileData);

      if (!importedData.projects || !importedData.tasks) {
        throw new Error('导入的数据格式不正确');
      }

      store.set('projects', importedData.projects);
      for (const projectId in importedData.tasks) {
        store.set(`tasks.${projectId}`, importedData.tasks[projectId]);
      }

      event.reply('import-data-result', { success: true, message: '数据导入成功！' });
      event.reply('data-imported');
    } else {
      event.reply('import-data-result', { success: false, message: '导入已取消' });
    }
  } catch (error) {
    console.error('导入数据错误:', error);
    event.reply('import-data-result', { success: false, message: `导入失败: ${error.message}` });
  }
}

module.exports = { exportData, importData };
