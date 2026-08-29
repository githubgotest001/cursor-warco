/**
 * 一次性工具：把 drafts/favicon-32.png 与 drafts/favicon-16.png 打包成 public/favicon.ico
 * （PNG-in-ICO 格式，Vista+ 与全部现代浏览器支持；零依赖，纯 Buffer 拼装）
 * 用法：node drafts/make-favicon.js
 * 前置：先用 headless Chrome 按 icon-render.html 顶部注释渲染出两张 PNG
 */
const fs = require('node:fs');
const path = require('node:path');

const entries = [
  { size: 32, file: path.join(__dirname, 'favicon-32.png') },
  { size: 16, file: path.join(__dirname, 'favicon-16.png') },
].map(e => ({ ...e, data: fs.readFileSync(e.file) }));

const HEADER = 6, ENTRY = 16;
const header = Buffer.alloc(HEADER);
header.writeUInt16LE(0, 0);               // reserved
header.writeUInt16LE(1, 2);               // type: icon
header.writeUInt16LE(entries.length, 4);  // image count

let offset = HEADER + ENTRY * entries.length;
const dirs = entries.map(e => {
  const d = Buffer.alloc(ENTRY);
  d.writeUInt8(e.size === 256 ? 0 : e.size, 0);  // width
  d.writeUInt8(e.size === 256 ? 0 : e.size, 1);  // height
  d.writeUInt8(0, 2);                             // palette
  d.writeUInt8(0, 3);                             // reserved
  d.writeUInt16LE(1, 4);                          // color planes
  d.writeUInt16LE(32, 6);                         // bits per pixel
  d.writeUInt32LE(e.data.length, 8);              // data size
  d.writeUInt32LE(offset, 12);                    // data offset
  offset += e.data.length;
  return d;
});

const out = path.join(__dirname, '..', 'public', 'favicon.ico');
fs.writeFileSync(out, Buffer.concat([header, ...dirs, ...entries.map(e => e.data)]));
console.log(`已生成 ${out}（${fs.statSync(out).size} 字节，含 ${entries.map(e => e.size + 'px').join(' / ')}）`);
