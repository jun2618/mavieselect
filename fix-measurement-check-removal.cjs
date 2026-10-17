const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file);
  process.exit(1);
}

let source = fs.readFileSync(file, 'utf8');
const original = source;
const broken = '      setProjectRooms(defaultRooms))';
const fixed = '      setProjectRooms(defaultRooms)';
const count = source.split(broken).length - 1;

if (count !== 1) {
  console.error(`修正対象の一致数が想定外です: ${count}`);
  console.error('App.jsxの1597行付近を確認してください。');
  process.exit(1);
}

source = source.replace(broken, fixed);
fs.writeFileSync(file + '.before-parenthesis-fix', original, 'utf8');
fs.writeFileSync(file, source, 'utf8');

console.log('OK: setProjectRooms(defaultRooms)) の余分な ) を削除しました');
console.log('更新:', file);
console.log('バックアップ:', file + '.before-parenthesis-fix');
console.log('次に実行: npm run build');
