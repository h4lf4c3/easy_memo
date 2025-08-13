const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

// 读取PNG文件
const pngPath = path.join(__dirname, 'icon.png');
const pngBuffer = fs.readFileSync(pngPath);

// 转换为ICO
toIco([pngBuffer], { sizes: [16, 24, 32, 48, 64, 128], resize: true })
  .then(icoBuffer => {
    // 保存ICO文件
    fs.writeFileSync(path.join(__dirname, 'icon.ico'), icoBuffer);
    console.log('ICO文件已创建成功');
  })
  .catch(err => {
    console.error('转换失败:', err);
  });