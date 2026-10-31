const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-auto-tags-v1');
const MARKER = '/* M-CROSS_AUTO_TAGS_V1 */';

if (!fs.existsSync(appPath)) { console.error('ERROR: src/App.jsx が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(MARKER)) { console.log('SKIP: 自動タグV1は適用済みです。'); process.exit(0); }

const anchor = 'function emptyPropertyMaster() {';
if (!s.includes(anchor)) { console.error('ERROR: helper挿入位置が見つかりません。'); process.exit(1); }

const helpers = `/* M-CROSS_AUTO_TAGS_V1 */
function buildAutoTags(entry) {
  const tags = new Set()
  const records = entry.records || []
  const cfRecords = entry.cfRecords || []
  const softRecords = entry.softRecords || []
  const trimRecords = entry.floorTrimRecords || []
  const works = entry.additionalWorks || []

  if (records.length) tags.add('クロスあり')
  if (cfRecords.length) tags.add('CFあり')
  if (softRecords.length) tags.add('ソフト巾木あり')
  if (trimRecords.length) tags.add('床見切りあり')
  if (works.length) tags.add('追加作業あり')

  const text = [
    entry.siteMemo || '',
    ...records.flatMap(r => [r.room || '', r.type || '', r.memo || '']),
    ...cfRecords.flatMap(r => [r.room || '', r.memo || '']),
    ...softRecords.flatMap(r => [r.room || '', r.memo || '']),
    ...works.flatMap(r => [r.room || '', r.work || '', r.memo || '']),
  ].join(' ').toLocaleLowerCase('ja')

  const keywordTags = [
    ['換気扇', '換気扇'], ['畳', '畳'], ['トイレ', 'トイレ'], ['エアコン', 'エアコン'],
    ['網戸', '網戸'], ['照明', '照明'], ['電球', '電球'], ['水漏れ', '水漏れ'],
    ['窓台', '窓台'], ['カーテン', 'カーテン'], ['コーキング', 'コーキング'],
  ]
  keywordTags.forEach(([word, tag]) => { if (text.includes(word)) tags.add(tag) })
  return [...tags]
}

`;
s = s.replace(anchor, helpers + anchor);

// Smart Search V4: include generated tags in the existing search index.
if (s.includes('M-CROSS_SMART_SAVED_SEARCH_V4')) {
  const needle = "add('メモ',entry.draftMemo); add('現場メモ',entry.siteMemo);";
  if (!s.includes(needle)) { console.error('ERROR: かしこい検索V4のタグ追加位置が見つかりません。'); process.exit(1); }
  s = s.replace(needle, needle + " buildAutoTags(entry).forEach(tag=>add('タグ',tag));");
}

// Saved list card: display tags before primary actions, uniquely scoped by CSS class.
const cardAnchor = '                        <div className="savedPrimaryActions">';
const cardCount = s.split(cardAnchor).length - 1;
if (cardCount !== 1) { console.error(`ERROR: 保存カード表示位置が ${cardCount} 件でした。`); process.exit(1); }
const tagUi = `                        {buildAutoTags(entry).length > 0 && (
                          <div className="autoTagList" aria-label="自動タグ">
                            {buildAutoTags(entry).map(tag => <span className="autoTag" key={tag}>#{tag}</span>)}
                          </div>
                        )}
`;
s = s.replace(cardAnchor, tagUi + cardAnchor);

const styleAnchor = s.includes('<style>{appStyles}</style>') ? '<style>{appStyles}</style>' : (s.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) { console.error('ERROR: style要素を特定できません。'); process.exit(1); }
const css = `
.autoTagList{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px}.autoTag{display:inline-flex;align-items:center;min-height:26px;padding:3px 9px;border:1px solid rgba(110,145,232,.4);border-radius:999px;background:rgba(110,145,232,.1);color:inherit;font-size:11px;font-weight:800}.theme-cyber .autoTag{border-color:#00eaff;color:#8cffff;background:rgba(0,234,255,.08);text-shadow:0 0 5px rgba(0,234,255,.7)}.theme-luxury .autoTag{border-color:#d8b76a;color:#f1d88d;background:rgba(216,183,106,.08)}.theme-sakura .autoTag{border-color:#efbfd0;color:#b64670;background:rgba(255,120,173,.08)}.theme-ice .autoTag{border-color:#76d8ff;color:#176b9a;background:rgba(118,216,255,.1)}.theme-forest .autoTag{border-color:#72c98a;color:#285c3a;background:rgba(114,201,138,.1)}.theme-retro .autoTag{border-color:#00eaff;color:#fff11c;border-radius:0;background:#061020}.theme-galaxy .autoTag{border-color:#bda4ff;color:#e4d9ff;background:rgba(189,164,255,.1)}
`;
s = s.replace(styleAnchor, styleAnchor + '\n      <style>{`' + css + '`}</style>');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, s, 'utf8');
console.log('OK: 自動タグV1を追加しました。');
console.log('基本タグ: クロス/CF/ソフト巾木/床見切り/追加作業。キーワードタグも自動生成します。');
console.log('かしこい検索V4がある場合、タグも検索対象です。');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
