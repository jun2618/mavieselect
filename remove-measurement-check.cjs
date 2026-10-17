const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'App.jsx');
if (!fs.existsSync(file)) {
  console.error('見つかりません: ' + file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const original = s;

function replaceRequired(searchValue, replacement, label) {
  const before = s;
  s = s.replace(searchValue, replacement);
  if (s === before) {
    console.error('置換失敗: ' + label);
    process.exit(1);
  }
  console.log('OK:', label);
}

function removeAllLines(pattern, label) {
  const before = s;
  s = s.replace(pattern, '');
  if (s === before) {
    console.log('SKIP:', label, '（対象なし）');
  } else {
    console.log('OK:', label);
  }
}

// 1. 採寸チェック用stateを削除
removeAllLines(/^\s*const \[showMeasurementCheck, setShowMeasurementCheck\] = useState\(false\)\r?\n/gm, 'showMeasurementCheck stateを削除');
removeAllLines(/^\s*const \[returnToMeasurementCheck, setReturnToMeasurementCheck\] = useState\(false\)\r?\n/gm, 'returnToMeasurementCheck stateを削除');
removeAllLines(/^\s*const \[roomConfirmations, setRoomConfirmations\] = useState\(\{\}\)\r?\n/gm, 'roomConfirmations stateを削除');

// 2. 採寸チェック用の集計と関数を削除
removeAllLines(/^\s*const confirmedRoomCount = .*\r?\n/gm, '確認済み部屋数を削除');
replaceRequired(
  /\n\s*function markRoomUnconfirmed\(roomName\) \{[\s\S]*?\n\s*function markUnsaved\(\) \{/,
  '\n\n  function markUnsaved() {',
  '採寸チェック用関数を削除'
);
replaceRequired(
  /\n\s*function getRoomInputStatus\(roomName\) \{[\s\S]*?\n\s*\}\n\n\s*const fontScales/,
  '\n\n  const fontScales',
  '部屋入力状況判定を削除'
);

// 3. CF・ソフト巾木の変更通知を未保存管理へ一本化
s = s.replaceAll('onRoomRecordsChanged,', 'onRecordsChanged,');
s = s.replaceAll('onRoomRecordsChanged(room)', 'onRecordsChanged()');
s = s.replaceAll('onRoomRecordsChanged={markRoomUnconfirmed}', 'onRecordsChanged={markUnsaved}');
console.log('OK: CF・ソフト巾木の変更通知を未保存管理へ変更');

// 4. クロス追加・削除時の確認解除を削除し、未保存管理だけ残す
removeAllLines(/^\s*markRoomUnconfirmed\(room\)\r?\n/gm, 'クロス追加時の確認解除を削除');
replaceRequired(
  /\n\s*const deletedRecord = records\.find\(item => item\.id === id\)\n\s*setRecords\(prev => prev\.filter\(item => item\.id !== id\)\)\n\s*if \(deletedRecord\) markRoomUnconfirmed\(deletedRecord\.room\)/,
  '\n    setRecords(prev => prev.filter(item => item.id !== id))',
  'クロス削除時の確認解除を削除'
);

// 5. 部屋名変更・削除でroomConfirmationsを触る処理を削除
removeAllLines(/\n\s*setRoomConfirmations\(previous => \{[\s\S]*?\n\s*\}\)/g, '部屋変更時のroomConfirmations更新を削除');

// 6. 保存データの読み書きからroomConfirmationsを削除
removeAllLines(/\n\s*setRoomConfirmations\([\s\S]*?\n\s*\)/g, '保存データ読込時のroomConfirmationsを削除');
removeAllLines(/^\s*roomConfirmations: entry\.roomConfirmations[\s\S]*?\s*: \{\},\r?\n/gm, '上書き保存のroomConfirmationsを削除');
removeAllLines(/^\s*roomConfirmations,\r?\n/gm, '通常保存のroomConfirmationsを削除');

// 7. 初期化処理から採寸チェック関連のstate更新を削除
removeAllLines(/^\s*setShowMeasurementCheck\([^\n]*\)\r?\n/gm, 'showMeasurementCheck更新を削除');
removeAllLines(/^\s*setReturnToMeasurementCheck\([^\n]*\)\r?\n/gm, 'returnToMeasurementCheck更新を削除');
removeAllLines(/^\s*setRoomConfirmations\([^\n]*\)\r?\n/gm, 'roomConfirmations初期化を削除');

// 8. 見出しから採寸チェック分岐を削除
replaceRequired(
  /\{showRoomManagement\s*\? '部屋管理'\s*:\s*showMeasurementCheck\s*\? '採寸チェック'\s*:\s*activePage === 'cross'/,
  "{showRoomManagement\n                ? '部屋管理'\n                : activePage === 'cross'",
  '見出しの採寸チェック分岐を削除'
);

// 9. 採寸カテゴリ表示条件を部屋管理だけにする
replaceRequired(
  /\{!showRoomManagement && !showMeasurementCheck && \(/,
  '{!showRoomManagement && (',
  '採寸カテゴリ表示条件を整理'
);

// 10. 採寸チェックボタンと部屋管理ボタンを、部屋管理ボタンだけに置換
replaceRequired(
  /\s*\{!showRoomManagement && \(\s*<button[\s\S]*?採寸チェック[\s\S]*?<\/button>\s*\)\}\s*\{!showMeasurementCheck && \(\s*<button\s*className="measurementCheckButton"[\s\S]*?<\/button>\s*\)\}/,
  `\n\n            <button\n              className="measurementCheckButton"\n              type="button"\n              onClick={() => setShowRoomManagement(previous => !previous)}\n            >\n              {showRoomManagement ? '← 採寸画面へ戻る' : '⚙ 部屋管理'}\n            </button>`,
  '採寸チェックボタンを削除'
);

// 11. 採寸チェック画面全体を削除
replaceRequired(
  /\) : showMeasurementCheck \? \([\s\S]*?\) : activePage === 'cf' \? \(/,
  ") : activePage === 'cf' ? (",
  '採寸チェック画面を削除'
);

// 12. 採寸チェック専用CSSを削除
removeAllLines(/^\s*\.roomCheck[^\n]*\r?\n/gm, '採寸チェック専用CSSを削除');
removeAllLines(/^\s*\.roomConfirmButton[^\n]*\r?\n/gm, '確認ボタンCSSを削除');
removeAllLines(/^\s*\.theme-dark \.roomCheck[^\n]*\r?\n/gm, 'ダークテーマの採寸チェックCSSを削除');
removeAllLines(/^\s*\.theme-dark \.roomConfirmButton[^\n]*\r?\n/gm, 'ダークテーマの確認ボタンCSSを削除');
removeAllLines(/^\s*\.theme-pop \.roomCheck[^\n]*\r?\n/gm, 'ポップテーマの採寸チェックCSSを削除');

// 13. 念のため残存参照を検査
const forbidden = [
  'showMeasurementCheck',
  'setShowMeasurementCheck',
  'returnToMeasurementCheck',
  'setReturnToMeasurementCheck',
  'roomConfirmations',
  'setRoomConfirmations',
  'markRoomUnconfirmed',
  'toggleRoomConfirmation',
  'getRoomInputStatus',
  '採寸チェック',
];
const leftovers = forbidden.filter(word => s.includes(word));
if (leftovers.length) {
  console.error('削除後も参照が残っています:', leftovers.join(', '));
  process.exit(1);
}

if (s === original) {
  console.error('変更がありませんでした');
  process.exit(1);
}

const backup = file + '.before-remove-measurement-check';
fs.writeFileSync(backup, original, 'utf8');
fs.writeFileSync(file, s, 'utf8');

console.log('\n完了');
console.log('更新:', file);
console.log('バックアップ:', backup);
console.log('次に実行: npm run build');
