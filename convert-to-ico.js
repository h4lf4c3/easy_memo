const fs = require('fs');
const path = require('path');
const svg2img = require('svg2img');
const pngToIco = require('png-to-ico');

// 读取SVG文件并转换为PNG
const svgPath = path.join(__dirname, 'icon.svg');
const pngPath = path.join(__dirname, 'icon-256.png');

// 先将SVG转换为高分辨率PNG
sv2img = (svg, options) => {
  return new Promise((resolve, reject) => {
    svg2img(svg, options, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
};

// 读取SVG内容
const svgContent = fs.readFileSync(svgPath, 'utf8');

// 转换为256x256的PNG
sv2img(svgContent, { width: 256, height: 256 })
  .then(buffer => {
    // 保存PNG文件
    fs.writeFileSync(pngPath, buffer);
    console.log('PNG文件已创建成功');
    
    // 将PNG转换为ICO
    return pngToIco([pngPath]);
  })
  .then(icoBuffer => {
    // 保存ICO文件
    fs.writeFileSync(path.join(__dirname, 'icon.ico'), icoBuffer);
    console.log('高分辨率ICO文件已创建成功');
  })
  .catch(err => {
    console.error('转换失败:', err);
  });