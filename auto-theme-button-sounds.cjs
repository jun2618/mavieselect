const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-auto-theme-sounds');

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');

if (!source.includes('M-CROSS_THEME_BUTTON_SOUNDS_V2_START')) {
  console.error('ERROR: 先ほどのテーマ別クリック音V2が見つからないため中止しました。');
  process.exit(1);
}

if (source.includes('M-CROSS_AUTO_THEME_SOUNDS_APPLIED')) {
  console.log('SKIP: すでに自動テーマ音へ変更済みです。');
  process.exit(0);
}

// 1. クリック音を常時有効化
const offCheck = "  if (mCrossIsSoundOff()) return\n";
if (!source.includes(offCheck)) {
  console.error('ERROR: 操作音OFF判定が見つからないため中止しました。');
  process.exit(1);
}
source = source.replace(offCheck, '');

// 2. 設定画面の「操作音」UIだけを削除
const soundHeadingIndex = source.indexOf('>操作音</h3>');
if (soundHeadingIndex === -1) {
  console.error('ERROR: 設定画面の「操作音」が見つからないため中止しました。');
  process.exit(1);
}

const blockStart = source.lastIndexOf('<h3', soundHeadingIndex);
const nextMenu = source.indexOf('<div className="settingsMenu"', soundHeadingIndex);
if (blockStart === -1 || nextMenu === -1 || nextMenu <= blockStart) {
  console.error('ERROR: 操作音設定の範囲を安全に特定できないため中止しました。');
  process.exit(1);
}

const removalLength = nextMenu - blockStart;
if (removalLength < 100 || removalLength > 3000) {
  console.error('ERROR: 削除予定範囲が想定外のため中止しました。');
  process.exit(1);
}

source = source.slice(0, blockStart) + source.slice(nextMenu);
source += '\n/* M-CROSS_AUTO_THEME_SOUNDS_APPLIED */\n';

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: 操作音設定を削除し、テーマ連動のクリック音を常時ONにしました。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
