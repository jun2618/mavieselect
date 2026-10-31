const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-cross-cf-enter-key-v2');
const MARKER = '/* M-CROSS_CROSS_CF_ENTER_KEY_V2 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: EnterキーV2はすでに適用済みです。');
  process.exit(0);
}

function replaceRegex(label, regex, replacement, expected = 1) {
  const matches = source.match(regex) || [];
  if (matches.length !== expected) {
    console.error(`ERROR: ${label} の対象が ${matches.length} 件でした。安全のため中止します。`);
    process.exit(1);
  }
  source = source.replace(regex, replacement);
}

// NumberKeypad に Enter 用プロパティを追加
replaceRegex(
  'NumberKeypad引数',
  /function NumberKeypad\(\{ activeInput, onKey, decimalInput \}\) \{/g,
  'function NumberKeypad({ activeInput, onKey, decimalInput, showEnter = false, onEnter }) {'
);

// 現在の複数行の小数点ボタンを、同じ大きさの「.」「Enter」横並びへ変更
replaceRegex(
  '小数点ボタン',
  /\{decimalInput && \(\s*<button type="button" className="keypadButton" style=\{\{ gridColumn: 'span 2' \}\} onClick=\{\(\) => onKey\('decimal'\)\}>\.<\/button>\s*\)\}/g,
  `{decimalInput && (\n        <div className="keypadEnterRow">\n          <button type="button" className="keypadButton" onClick={() => onKey('decimal')}>.</button>\n          {showEnter && <button type="button" className="keypadButton keypadEnterButton" onClick={onEnter}>Enter</button>}\n        </div>\n      )}`
);

// CF/ソフト巾木共用セクションにEnter処理を追加
replaceRegex(
  'CF addRecord開始',
  /  function addRecord\(event\) \{\s*event\.preventDefault\(\)/g,
  `  function handleMeasurementEnter() {\n    if (countOnly) return\n\n    if (activeInput === 'length') {\n      const numericLength = Number(length.replace(/[。．]/g, '.'))\n      if (!Number.isFinite(numericLength) || numericLength <= 0) return\n      setActiveInput('count')\n      return\n    }\n\n    if (activeInput === 'count') {\n      const numericLength = Number(length.replace(/[。．]/g, '.'))\n      const numericCount = Number(count)\n      if (!Number.isFinite(numericLength) || numericLength <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return\n      addRecord({ preventDefault() {} })\n      setActiveInput('length')\n    }\n  }\n\n  function addRecord(event) {\n    event.preventDefault()`
);

// CFテンキーへEnterを接続
replaceRegex(
  'CF NumberKeypad',
  /<NumberKeypad activeInput=\{activeInput\} onKey=\{updateInput\} decimalInput=\{!countOnly && \(activeInput === 'length' \|\| activeInput === 'count'\)\} \/>/g,
  `<NumberKeypad\n                activeInput={activeInput}\n                onKey={updateInput}\n                decimalInput={!countOnly && (activeInput === 'length' || activeInput === 'count')}\n                showEnter={!countOnly}\n                onEnter={handleMeasurementEnter}\n              />`
);

// CFの登録ボタンを消し、ソフト巾木だけ残す
replaceRegex(
  'CF登録ボタン',
  /<button className="add" type="submit">\{countOnly \? '＋ ソフト巾木登録' : `＋ \$\{title\}の内容を登録`\}<\/button>/g,
  `{countOnly && <button className="add" type="submit">＋ ソフト巾木登録</button>}`
);

// クロスにEnter処理を追加
replaceRegex(
  'クロス addCrossRecord開始',
  /  function addCrossRecord\(event\) \{\s*event\.preventDefault\(\)/g,
  `  function handleCrossEnter() {\n    if (activeInput === 'height') {\n      const numericHeight = Number(height.replace(/[。．]/g, '.'))\n      if (!Number.isFinite(numericHeight) || numericHeight <= 0) return\n      setActiveInput('count')\n      return\n    }\n\n    if (activeInput === 'count') {\n      const numericHeight = Number(height.replace(/[。．]/g, '.'))\n      const numericCount = Number(count)\n      if (!Number.isFinite(numericHeight) || numericHeight <= 0 || !Number.isFinite(numericCount) || numericCount <= 0) return\n      addCrossRecord({ preventDefault() {} })\n      setActiveInput('height')\n    }\n  }\n\n  function addCrossRecord(event) {\n    event.preventDefault()`
);

// クロステンキーへEnterを接続
replaceRegex(
  'クロス NumberKeypad',
  /<NumberKeypad\s+activeInput=\{activeInput\}\s+onKey=\{updateCrossInput\}\s+decimalInput=\{activeInput === 'height' \|\| activeInput === 'count'\}\s*\/>/g,
  `<NumberKeypad\n                            activeInput={activeInput}\n                            onKey={updateCrossInput}\n                            decimalInput={activeInput === 'height' || activeInput === 'count'}\n                            showEnter\n                            onEnter={handleCrossEnter}\n                          />`
);

// クロス登録ボタンを削除
replaceRegex(
  'クロス登録ボタン',
  /\s*<button className="add crossRegister" type="submit">\s*＋ \{measurementType\}の内容を登録\s*<\/button>/g,
  ''
);

// 同サイズ横並び用CSSを追加
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

console.log('OK: クロス・CFへEnterキーV2を追加しました。');
console.log('クロス: 高さ→Enter→本数→Enter→登録→高さ');
console.log('CF: 長さ→Enter→本数→Enter→登録→長さ');
console.log('ソフト巾木・床見切り: 従来の登録ボタンを維持');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
