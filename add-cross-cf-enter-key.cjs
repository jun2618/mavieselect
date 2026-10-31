const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-cross-cf-enter-key');
const MARKER = '/* M-CROSS_CROSS_CF_ENTER_KEY_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: Enterキー機能はすでに適用済みです。');
  process.exit(0);
}

const original = source;
function replaceOnce(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} の対象が ${count} 件でした。安全のため中止します。`);
    process.exit(1);
  }
  source = source.replace(oldText, newText);
}

// 1. NumberKeypadにEnter用プロパティを追加
replaceOnce(
  'NumberKeypad引数',
  "function NumberKeypad({ activeInput, onKey, decimalInput }) {",
  "function NumberKeypad({ activeInput, onKey, decimalInput, showEnter = false, onEnter }) {"
);

// 2. 小数点とEnterを同じ大きさで横並びにする
replaceOnce(
  '小数点ボタン',
  "{decimalInput && <button type=\"button\" className=\"keypadButton\" style={{ gridColumn: 'span 2' }} onClick={() => onKey('decimal')}>.</button>}",
  `{decimalInput && (\n        <div className=\"keypadEnterRow\">\n          <button type=\"button\" className=\"keypadButton\" onClick={() => onKey('decimal')}>.</button>\n          {showEnter && <button type=\"button\" className=\"keypadButton keypadEnterButton\" onClick={onEnter}>Enter</button>}\n        </div>\n      )}`
);

// 3. CF共用画面のEnter処理を追加（ソフト巾木には使わない）
replaceOnce(
  'CF addRecord開始',
  "  function addRecord(event) {\n    event.preventDefault()",
  `  function handleMeasurementEnter() {\n    if (countOnly) return\n    if (activeInput === 'length') {\n      if (!Number.isFinite(Number(length.replace(/[。．]/g, '.'))) || Number(length.replace(/[。．]/g, '.')) <= 0) return\n      setActiveInput('count')\n      return\n    }\n    if (activeInput === 'count') {\n      const numericLength = Number(length.replace(/[。．]/g, '.'))\n      const numericCount = Number(count)\n      if (!Number.isFinite(numericLength) || numericLength <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return\n      addRecord({ preventDefault() {} })\n      setActiveInput('length')\n    }\n  }\n\n  function addRecord(event) {\n    event.preventDefault()`
);

// 4. CFテンキーにEnterを接続
replaceOnce(
  'CF NumberKeypad',
  "<NumberKeypad activeInput={activeInput} onKey={updateInput} decimalInput={!countOnly && (activeInput === 'length' || activeInput === 'count')} />",
  "<NumberKeypad activeInput={activeInput} onKey={updateInput} decimalInput={!countOnly && (activeInput === 'length' || activeInput === 'count')} showEnter={!countOnly} onEnter={handleMeasurementEnter} />"
);

// 5. CFの登録ボタンを削除し、ソフト巾木だけ残す
replaceOnce(
  'CF登録ボタン',
  "<button className=\"add\" type=\"submit\">{countOnly ? '＋ ソフト巾木登録' : `＋ ${title}の内容を登録`}</button>",
  "{countOnly && <button className=\"add\" type=\"submit\">＋ ソフト巾木登録</button>}"
);

// 6. クロス用Enter処理を追加
replaceOnce(
  'クロス addCrossRecord開始',
  "  function addCrossRecord(event) {\n    event.preventDefault()",
  `  function handleCrossEnter() {\n    if (activeInput === 'height') {\n      const numericHeight = Number(height.replace(/[。．]/g, '.'))\n      if (!Number.isFinite(numericHeight) || numericHeight <= 0) return\n      setActiveInput('count')\n      return\n    }\n    if (activeInput === 'count') {\n      const numericHeight = Number(height.replace(/[。．]/g, '.'))\n      const numericCount = Number(count)\n      if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return\n      addCrossRecord({ preventDefault() {} })\n      setActiveInput('height')\n    }\n  }\n\n  function addCrossRecord(event) {\n    event.preventDefault()`
);

// 7. クロステンキーにEnterを接続
replaceOnce(
  'クロス NumberKeypad',
  `                          <NumberKeypad\n                            activeInput={activeInput}\n                            onKey={updateCrossInput}\n                            decimalInput={activeInput === 'height' || activeInput === 'count'}\n                          />`,
  `                          <NumberKeypad\n                            activeInput={activeInput}\n                            onKey={updateCrossInput}\n                            decimalInput={activeInput === 'height' || activeInput === 'count'}\n                            showEnter\n                            onEnter={handleCrossEnter}\n                          />`
);

// 8. クロス登録ボタンを削除
replaceOnce(
  'クロス登録ボタン',
  `\n                          <button className=\"add crossRegister\" type=\"submit\">\n                            ＋ {measurementType}の内容を登録\n                          </button>`,
  ''
);

// 9. Enter行のCSSを追加
const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できないため中止しました。');
  process.exit(1);
}

const css = `\n${MARKER}\n.keypadEnterRow {\n  grid-column: 1 / -1;\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 10px;\n}\n.keypadEnterRow .keypadButton {\n  width: 100%;\n  min-width: 0;\n}\n.keypadEnterButton {\n  font-weight: 800;\n}\n`;
source = source.replace(styleAnchor, `${styleAnchor}\n      <style>{\`${css}\`}</style>`);

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');

console.log('OK: クロス・CFのテンキーにEnterキーを追加しました。');
console.log('クロス: 高さ→Enter→本数→Enter→登録→高さ');
console.log('CF: 長さ→Enter→本数→Enter→登録→長さ');
console.log('ソフト巾木・床見切り: 従来の登録ボタンを維持');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
