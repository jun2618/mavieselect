const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-smart-saved-search');
const MARKER = '/* M-CROSS_SMART_SAVED_SEARCH_V1 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}
let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: かしこい検索はすでに適用済みです。');
  process.exit(0);
}

function replaceOnce(label, oldText, newText) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    console.error(`ERROR: ${label} の対象が ${count} 件でした。安全のため中止します。`);
    process.exit(1);
  }
  source = source.replace(oldText, newText);
}

// Insert helper functions before emptyPropertyMaster, near the existing search helpers.
const helperAnchor = 'function emptyPropertyMaster() {';
if (!source.includes(helperAnchor)) {
  console.error('ERROR: 検索ヘルパー挿入位置を確認できないため中止しました。');
  process.exit(1);
}
const helpers = String.raw`${MARKER}
const smartSearchSynonyms = [
  ['cf', 'クッションフロア'],
  ['クロス', '壁紙'],
  ['ソフト巾木', '巾木'],
  ['床見切り', '見切り'],
]

function normalizeSmartSearchText(value) {
  return String(value ?? '')
    .toLocaleLowerCase('ja')
    .replace(/[\s　]+/g, '')
    .replace(/[()（）［］\[\]・,，.。:：/\\_-]+/g, '')
}

function expandSmartSearchToken(token) {
  const normalized = normalizeSmartSearchText(token)
  if (!normalized) return []
  const expanded = new Set([normalized])
  smartSearchSynonyms.forEach(group => {
    const normalizedGroup = group.map(normalizeSmartSearchText)
    if (normalizedGroup.some(item => item === normalized)) {
      normalizedGroup.forEach(item => expanded.add(item))
    }
  })
  return [...expanded]
}

function getSavedEntrySearchParts(entry) {
  const parts = []
  const push = (label, value) => {
    const text = String(value ?? '').trim()
    if (text) parts.push({ label, text })
  }

  push('物件名', entry.propertyName)
  push('管理会社', entry.company)
  push('住所', entry.address)
  push('号室', entry.unit)
  push('メモ', entry.draftMemo)

  ;(entry.rooms || []).forEach(value => push('部屋', value))
  ;(entry.records || []).forEach(record => {
    push('部屋', record.room)
    push('クロス', record.type)
    push('メモ', record.memo)
  })
  ;(entry.cfRecords || []).forEach(record => {
    push('部屋', record.room)
    push('工事', 'CF クッションフロア')
    push('メモ', record.memo)
  })
  ;(entry.softRecords || []).forEach(record => {
    push('部屋', record.room)
    push('工事', 'ソフト巾木 巾木')
    push('メモ', record.memo)
  })
  ;(entry.floorTrimRecords || []).forEach(record => {
    push('部屋', record.roomA)
    push('部屋', record.roomB)
    push('工事', '床見切り 見切り')
    push('カラー', record.color)
  })
  ;(entry.additionalWorks || []).forEach(record => {
    push('部屋', record.room)
    push('追加作業', record.work)
    push('メモ', record.memo)
  })
  return parts
}

function smartSavedEntryMatch(entry, query) {
  const tokens = String(query || '').trim().split(/[\s　]+/).filter(Boolean)
  if (tokens.length === 0) return { matched: true, reasons: [] }

  const parts = getSavedEntrySearchParts(entry).map(part => ({
    ...part,
    normalized: normalizeSmartSearchText(part.text),
  }))
  const reasons = []

  const matched = tokens.every(token => {
    const alternatives = expandSmartSearchToken(token)
    const hits = parts.filter(part => alternatives.some(term => part.normalized.includes(term)))
    if (hits.length === 0) return false
    hits.slice(0, 2).forEach(hit => reasons.push(`${hit.label}: ${hit.text}`))
    return true
  })

  return { matched, reasons: [...new Set(reasons)].slice(0, 4) }
}

`;
source = source.replace(helperAnchor, helpers + helperAnchor);

// Replace saved-list filtering only. Keep company filter, archive filter and sorting intact.
const oldFilter = `  const filteredSavedEntries = savedEntries
    .filter(entry => Boolean(entry.archived) === showArchived)
    .filter(entry => !savedCompanyFilter || entry.company === savedCompanyFilter)
    .filter(entry => !normalizedSavedSearch || String(entry.propertyName || '').toLocaleLowerCase().includes(normalizedSavedSearch))`;
const newFilter = `  const filteredSavedEntries = savedEntries
    .filter(entry => Boolean(entry.archived) === showArchived)
    .filter(entry => !savedCompanyFilter || entry.company === savedCompanyFilter)
    .filter(entry => smartSavedEntryMatch(entry, savedSearch).matched)`;
replaceOnce('保存済み一覧の検索条件', oldFilter, newFilter);

// Rename and broaden the search input.
replaceOnce('検索ラベル', '<span>🔎 物件を検索</span>', '<span>🔎 かしこい検索</span>');
replaceOnce('検索placeholder', 'placeholder="物件名を入力"', 'placeholder="物件名・住所・号室・部屋・工事・メモを検索"');

// Show why each result matched, below existing company metadata.
const metaNeedle = '<div className="savedMeta">{entry.company || \'管理会社未設定\'}</div>';
const metaReplacement = `<div className="savedMeta">{entry.company || '管理会社未設定'}</div>
                          {savedSearch.trim() && smartSavedEntryMatch(entry, savedSearch).reasons.length > 0 && (
                            <div className="smartSearchReasons">
                              一致：{smartSavedEntryMatch(entry, savedSearch).reasons.join(' / ')}
                            </div>
                          )}`;
replaceOnce('検索一致理由', metaNeedle, metaReplacement);

// Small UI styling; theme colors inherit from each saved card.
const styleAnchor = source.includes('<style>{appStyles}</style>')
  ? '<style>{appStyles}</style>'
  : (source.includes('<style>{styles}</style>') ? '<style>{styles}</style>' : null);
if (!styleAnchor) {
  console.error('ERROR: style要素を特定できないため中止しました。');
  process.exit(1);
}
const css = String.raw`
.smartSearchReasons {
  margin-top: 4px;
  color: inherit;
  opacity: .82;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
`;
source = source.replace(styleAnchor, `${styleAnchor}\n      <style>{\`${css.replace(/`/g, '\\`')}\`}</style>`);

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');
console.log('OK: 保存済み一覧へ「かしこい検索」を追加しました。');
console.log('検索対象: 物件名・管理会社・住所・号室・部屋・クロス/CF/巾木/見切り・各メモ・追加作業');
console.log('複数語: すべての語に一致する物件を表示します。');
console.log('同義語: CF/クッションフロア、クロス/壁紙、ソフト巾木/巾木、床見切り/見切り');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev で確認してください。');
