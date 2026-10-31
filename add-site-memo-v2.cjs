const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-site-memo-v2');
const MARKER = '/* M-CROSS_SITE_MEMO_V2 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(MARKER)) {
  console.log('SKIP: 現場メモV2は適用済みです。');
  process.exit(0);
}

function replaceOne(label, regex, replacement) {
  const matches = s.match(regex) || [];
  if (matches.length !== 1) {
    console.error(`ERROR: ${label} の対象が ${matches.length} 件でした。安全のため中止しました。`);
    process.exit(1);
  }
  s = s.replace(regex, replacement);
}

// 1. Main App state. Avoid AdditionalWorkForm's own unit state.
replaceOne(
  '現場メモstate追加',
  /  const \[propertySearch, setPropertySearch\] = useState\(''\)\s*\n  const \[selectedProperty, setSelectedProperty\] = useState\(null\)\s*\n  const \[unit, setUnit\] = useState\(''\)/,
  "  const [propertySearch, setPropertySearch] = useState('')\n  const [selectedProperty, setSelectedProperty] = useState(null)\n  const [unit, setUnit] = useState('')\n  const [siteMemo, setSiteMemo] = useState('')"
);

// 2. Reset when opening a fresh property screen.
replaceOne(
  '新規画面リセット',
  /      setPropertySearch\(''\)\s*\n      setSelectedProperty\(null\)\s*\n      setUnit\(''\)\s*\n      setCurrentStorageKey\(''\)/,
  "      setPropertySearch('')\n      setSelectedProperty(null)\n      setUnit('')\n      setSiteMemo('')\n      setCurrentStorageKey('')"
);

// 3. Load saved entry.
replaceOne(
  '保存物件読込',
  /    setSelectedProperty\(\{ name: entry\.propertyName \|\| '', address: entry\.address \|\| '' \}\)\s*\n    setUnit\(entry\.unit \|\| ''\)/,
  "    setSelectedProperty({ name: entry.propertyName || '', address: entry.address || '' })\n    setUnit(entry.unit || '')\n    setSiteMemo(entry.siteMemo || '')"
);

// 4. Restore working draft.
replaceOne(
  '作業中データ復元',
  /    setUnit\(draft\.unit \|\| ''\)\s*\n    setRecords\(/,
  "    setUnit(draft.unit || '')\n    setSiteMemo(draft.siteMemo || '')\n    setRecords("
);

// 5. Persist in every current-project object that uses unit.trim().
const unitNeedle = 'unit: unit.trim(),';
const unitCount = s.split(unitNeedle).length - 1;
if (unitCount < 1) {
  console.error('ERROR: 保存データの unit: unit.trim() が見つかりません。');
  process.exit(1);
}
s = s.split(unitNeedle).join("unit: unit.trim(),\n      siteMemo: siteMemo.trim(),");

// 6. Preserve through imported file normalization when shape exists.
if (s.includes("draftMemo: typeof value.draftMemo === 'string' ? value.draftMemo : ''")) {
  s = s.replace(
    "draftMemo: typeof value.draftMemo === 'string' ? value.draftMemo : ''",
    "draftMemo: typeof value.draftMemo === 'string' ? value.draftMemo : '',\n    siteMemo: typeof value.siteMemo === 'string' ? value.siteMemo : ''"
  );
}

// 7. Preserve in overwrite/export objects based on an existing entry.
s = s.replace(
  /unit: entry\.unit \|\| '',\s*\n(\s*)records:/g,
  "unit: entry.unit || '',\n$1siteMemo: entry.siteMemo || '',\n$1records:"
);

// 8. Include siteMemo in auto-save effect dependencies when exact tail exists.
s = s.replace(/currentStorageKey\]\)/g, 'currentStorageKey, siteMemo])');

// 9. Add top-screen UI between unit and start button.
replaceOne(
  'トップ画面UI',
  /              <label>\s*\n                <span>号室<\/span>\s*\n                <input value=\{unit\} onChange=\{event => setUnit\(event\.target\.value\)\} placeholder="例：501" \/>\s*\n              <\/label>\s*\n              <button className="primary" disabled=\{!selectedProperty \|\| !unit\.trim\(\)\} onClick=\{startMeasurement\}>採寸を開始する →<\/button>/,
  `              <label>\n                <span>号室</span>\n                <input value={unit} onChange={event => setUnit(event.target.value)} placeholder="例：501" />\n              </label>\n\n              <label className="siteMemoField">\n                <span>現場メモ</span>\n                <textarea\n                  value={siteMemo}\n                  onChange={event => setSiteMemo(event.target.value)}\n                  placeholder="例：赤い外壁、角地、駐車場狭い、入口に自販機"\n                  rows={3}\n                />\n                <small>建物の特徴・駐車場所・鍵・次回確認事項など。かしこい検索にも使えます。</small>\n              </label>\n\n              <button className="primary" disabled={!selectedProperty || !unit.trim()} onClick={startMeasurement}>採寸を開始する →</button>`
);

// 10. Smart Search V4: index siteMemo.
if (s.includes('M-CROSS_SMART_SAVED_SEARCH_V4')) {
  const searchNeedle = "add('メモ',entry.draftMemo);";
  if (!s.includes(searchNeedle)) {
    console.error('ERROR: かしこい検索V4の現場メモ追加位置が見つかりません。');
    process.exit(1);
  }
  s = s.replace(searchNeedle, "add('メモ',entry.draftMemo); add('現場メモ',entry.siteMemo);");
}

// 11. CSS and marker.
const styleAnchor = s.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (s.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できません。');
  process.exit(1);
}
const css = `\n${MARKER}\n.siteMemoField textarea{width:100%;min-height:92px;resize:vertical;font:inherit;line-height:1.55;box-sizing:border-box}.siteMemoField small{display:block;margin-top:6px;opacity:.72;font-size:12px;line-height:1.45}\n`;
s = s.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, s, 'utf8');
console.log('OK: トップ画面へ現場メモV2を追加しました。');
console.log('保存・読込・作業中復元・かしこい検索に対応します。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
