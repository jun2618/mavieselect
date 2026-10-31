const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-site-memo-v1');
const MARKER = '/* M-CROSS_SITE_MEMO_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}

let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(MARKER)) {
  console.log('SKIP: 現場メモV1は適用済みです。');
  process.exit(0);
}

function replaceOne(label, oldText, newText) {
  const count = s.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} の対象が ${count} 件でした。安全のため中止しました。`);
    process.exit(1);
  }
  s = s.replace(oldText, newText);
}

// 1) State: place next to unit.
replaceOne(
  'state追加位置',
  "  const [unit, setUnit] = useState('')",
  "  const [unit, setUnit] = useState('')\n  const [siteMemo, setSiteMemo] = useState('')"
);

// 2) Clear on fresh property screen.
replaceOne(
  '新規画面リセット',
  "      setUnit('')\n      setCurrentStorageKey('')",
  "      setUnit('')\n      setSiteMemo('')\n      setCurrentStorageKey('')"
);

// 3) Load saved entry.
replaceOne(
  '保存物件読み込み',
  "    setUnit(entry.unit || '')\n    setRecords(Array.isArray(entry.records) ? entry.records : [])",
  "    setUnit(entry.unit || '')\n    setSiteMemo(entry.siteMemo || '')\n    setRecords(Array.isArray(entry.records) ? entry.records : [])"
);

// 4) Restore working draft.
replaceOne(
  '作業中データ復元',
  "    setUnit(draft.unit || '')\n    setRecords(Array.isArray(draft.records) ? draft.records : [])",
  "    setUnit(draft.unit || '')\n    setSiteMemo(draft.siteMemo || '')\n    setRecords(Array.isArray(draft.records) ? draft.records : [])"
);

// 5) Add siteMemo to saved/draft objects wherever unit: unit.trim() occurs.
const unitObjectNeedle = "unit: unit.trim(),";
const objectCount = s.split(unitObjectNeedle).length - 1;
if (objectCount < 1) {
  console.error('ERROR: 保存データの unit: unit.trim() が見つかりません。');
  process.exit(1);
}
s = s.split(unitObjectNeedle).join("unit: unit.trim(),\n      siteMemo: siteMemo.trim(),");

// 6) Add siteMemo to objects where unit is passed without trim in overwrite/export-style saved entry.
s = s.replace(/unit: entry\.unit \|\| '',\n(\s*)records:/g, "unit: entry.unit || '',\n$1siteMemo: entry.siteMemo || '',\n$1records:");

// 7) New top-screen UI: after unit label, before start button.
const startButtonNeedle = '<button className="primary" disabled={!selectedProperty || !unit.trim()} onClick={startMeasurement}>採寸を開始する →</button>';
if (!s.includes(startButtonNeedle)) {
  console.error('ERROR: 「採寸を開始する」ボタン位置を特定できません。');
  process.exit(1);
}
const memoUi = `
              <label className="siteMemoField">
                <span>現場メモ</span>
                <textarea
                  value={siteMemo}
                  onChange={event => setSiteMemo(event.target.value)}
                  placeholder="例：赤い外壁、角地、駐車場狭い、入口に自販機"
                  rows={3}
                />
                <small>建物の特徴・駐車場所・鍵・次回確認事項など。かしこい検索にも使えます。</small>
              </label>

              `;
s = s.replace(startButtonNeedle, memoUi + startButtonNeedle);

// 8) Smart search V4: add site memo to indexed search parts when feature exists.
if (s.includes('M-CROSS_SMART_SAVED_SEARCH_V4')) {
  const searchLine = "add('メモ',entry.draftMemo);";
  if (s.includes(searchLine)) {
    s = s.replace(searchLine, "add('メモ',entry.draftMemo); add('現場メモ',entry.siteMemo);");
  } else {
    console.error('ERROR: かしこい検索V4はありますが、検索項目追加位置が見つかりません。中止しました。');
    process.exit(1);
  }
}

// 9) Preserve field in imported normalized data when the normalized return shape is present.
if (s.includes("draftMemo: typeof value.draftMemo === 'string' ? value.draftMemo : ''")) {
  s = s.replace(
    "draftMemo: typeof value.draftMemo === 'string' ? value.draftMemo : ''",
    "draftMemo: typeof value.draftMemo === 'string' ? value.draftMemo : '',\n    siteMemo: typeof value.siteMemo === 'string' ? value.siteMemo : ''"
  );
}

// 10) Styling only, no theme overrides.
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

console.log('OK: トップ画面へ「現場メモ」を追加しました。');
console.log('保存・読込・作業中復元に現場メモを含めます。');
console.log('かしこい検索V4がある場合、現場メモも検索対象です。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
