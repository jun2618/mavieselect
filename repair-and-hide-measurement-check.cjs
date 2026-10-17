const fs = require('fs');
const path = require('path');

const appFile = path.join(process.cwd(), 'src', 'App.jsx');
const cleanBackup = appFile + '.before-remove-measurement-check';

if (!fs.existsSync(cleanBackup)) {
  console.error('復元用バックアップが見つかりません: ' + cleanBackup);
  process.exit(1);
}

let s = fs.readFileSync(cleanBackup, 'utf8');
const restoredOriginal = s;

function replaceOnce(oldText, newText, label) {
  const count = s.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`置換失敗: ${label} (一致数: ${count})`);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
  console.log('OK:', label);
}

// 1. 見出しから採寸チェック表示を外す
replaceOnce(
`              {showRoomManagement
                ? '部屋管理'
                : showMeasurementCheck
                  ? '採寸チェック'
                  : activePage === 'cross'`,
`              {showRoomManagement
                ? '部屋管理'
                : activePage === 'cross'`,
'見出しから採寸チェックを削除'
);

// 2. 採寸カテゴリーは部屋管理中だけ隠す
replaceOnce(
`            {!showRoomManagement && !showMeasurementCheck && (`,
`            {!showRoomManagement && (`,
'採寸カテゴリーの表示条件を整理'
);

// 3. 採寸チェックボタンを消し、部屋管理ボタンだけ残す
const buttonsStart = s.indexOf('            {!showRoomManagement && (\n              <button\n                className="measurementCheckButton"');
const contentStart = s.indexOf('            {showRoomManagement ? (', buttonsStart);
if (buttonsStart === -1 || contentStart === -1) {
  console.error('置換失敗: 採寸チェックボタン範囲を特定できません');
  process.exit(1);
}
const roomButton = `            <button
              className="measurementCheckButton"
              type="button"
              onClick={() => setShowRoomManagement(previous => !previous)}
            >
              {showRoomManagement ? '← 採寸画面へ戻る' : '⚙ 部屋管理'}
            </button>

`;
s = s.slice(0, buttonsStart) + roomButton + s.slice(contentStart);
console.log('OK: 採寸チェックボタンを削除');

// 4. 採寸チェック画面の分岐だけを外す
const checkBranchStart = s.indexOf(') : showMeasurementCheck ? (');
const cfBranchStart = s.indexOf(") : activePage === 'cf' ? (", checkBranchStart);
if (checkBranchStart === -1 || cfBranchStart === -1) {
  console.error('置換失敗: 採寸チェック画面範囲を特定できません');
  process.exit(1);
}
s = s.slice(0, checkBranchStart) + ") : activePage === 'cf' ? (" + s.slice(cfBranchStart + ") : activePage === 'cf' ? (".length);
console.log('OK: 採寸チェック画面を削除');

// 念のため、画面上に採寸チェックの文言がないことを確認
if (s.includes("'採寸チェック'")) {
  console.error('削除後も画面用の採寸チェック文言が残っています');
  process.exit(1);
}

// 現在の壊れたApp.jsxも別名で保全
if (fs.existsSync(appFile)) {
  fs.copyFileSync(appFile, appFile + '.broken-measurement-check-removal');
}
fs.writeFileSync(appFile, s, 'utf8');

console.log('\n完了');
console.log('復元元:', cleanBackup);
console.log('更新:', appFile);
console.log('壊れた版の保全:', appFile + '.broken-measurement-check-removal');
console.log('次に実行: npm run build');
