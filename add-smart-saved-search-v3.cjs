const fs = require('fs');
const path = require('path');

const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-smart-saved-search-v3');
const MARKER = '/* M-CROSS_SMART_SAVED_SEARCH_V3 */';

if (!fs.existsSync(appPath)) {
  console.error('ERROR: src/App.jsx が見つかりません。');
  process.exit(1);
}
let source = fs.readFileSync(appPath, 'utf8');
if (source.includes(MARKER)) {
  console.log('SKIP: かしこい検索V3は適用済みです。');
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

const helperAnchor = 'function emptyPropertyMaster() {';
if (!source.includes(helperAnchor)) {
  console.error('ERROR: helper挿入位置が見つかりません。');
  process.exit(1);
}

const helpers = `/* M-CROSS_SMART_SAVED_SEARCH_V3 */
const smartSearchSynonyms = [
  ['cf', 'クッションフロア'],
  ['クロス', '壁紙'],
  ['ソフト巾木', '巾木'],
  ['床見切り', '見切り'],
]

function normalizeSmartSearchText(value) {
  return String(value ?? '').toLocaleLowerCase('ja').replace(/[\\s　]+/g, '').replace(/[()（）［］\\[\\]・,，.。:：/\\\\_-]+/g, '')
}

function expandSmartSearchToken(token) {
  const normalized = normalizeSmartSearchText(token)
  if (!normalized) return []
  const result = new Set([normalized])
  smartSearchSynonyms.forEach(group => {
    const values = group.map(normalizeSmartSearchText)
    if (values.includes(normalized)) values.forEach(value => result.add(value))
  })
  return [...result]
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
  ;(entry.records || []).forEach(record => { push('部屋', record.room); push('クロス', record.type); push('メモ', record.memo) })
  ;(entry.cfRecords || []).forEach(record => { push('部屋', record.room); push('工事', 'CF クッションフロア'); push('メモ', record.memo) })
  ;(entry.softRecords || []).forEach(record => { push('部屋', record.room); push('工事', 'ソフト巾木 巾木'); push('メモ', record.memo) })
  ;(entry.floorTrimRecords || []).forEach(record => { push('部屋', record.roomA); push('部屋', record.roomB); push('工事', '床見切り 見切り'); push('カラー', record.color) })
  ;(entry.additionalWorks || []).forEach(record => { push('部屋', record.room); push('追加作業', record.work); push('メモ', record.memo) })
  return parts
}

function smartSavedEntryMatch(entry, query) {
  const tokens = String(query || '').trim().split(/[\\s　]+/).filter(Boolean)
  if (!tokens.length) return { matched: true, reasons: [] }
  const parts = getSavedEntrySearchParts(entry).map(part => ({ ...part, normalized: normalizeSmartSearchText(part.text) }))
  const reasons = []
  const matched = tokens.every(token => {
    const alternatives = expandSmartSearchToken(token)
    const hits = parts.filter(part => alternatives.some(term => part.normalized.includes(term)))
    if (!hits.length) return false
    hits.slice(0, 2).forEach(hit => reasons.push(hit.label + ': ' + hit.text))
    return true
  })
  return { matched, reasons: [...new Set(reasons)].slice(0, 4) }
}

`;
source = source.replace(helperAnchor, helpers + helperAnchor);

const oldMemo = `  const visibleSavedEntries = useMemo(() => {
    const query = savedSearch.trim().toLocaleLowerCase()

    return savedEntries
      .filter(entry => Boolean(entry.archived) === showArchived)
      .filter(entry => !savedCompanyFilter || entry.company === savedCompanyFilter)
      .filter(entry =>
        !query || String(entry.propertyName || '').toLocaleLowerCase().includes(query)
      )
      .sort((a, b) => {`;
const newMemo = `  const visibleSavedEntries = useMemo(() => {
    return savedEntries
      .filter(entry => Boolean(entry.archived) === showArchived)
      .filter(entry => !savedCompanyFilter || entry.company === savedCompanyFilter)
      .filter(entry => smartSavedEntryMatch(entry, savedSearch).matched)
      .sort((a, b) => {`;
replaceOnce('保存済み検索処理', oldMemo, newMemo);
replaceOnce('検索見出し', '<span>🔎 物件を検索</span>', '<span>🔎 かしこい検索</span>');
replaceOnce('検索placeholder', 'placeholder="物件名を入力"', 'placeholder="物件名・住所・号室・部屋・工事・メモを検索"');

fs.copyFileSync(appPath, backupPath);
fs.writeFileSync(appPath, source, 'utf8');
console.log('OK: 現在のApp.jsx専用「かしこい検索V3」を追加しました。');
console.log('対象: 物件名・管理会社・住所・号室・部屋・クロス・CF・巾木・見切り・メモ・追加作業');
console.log('BACKUP:', backupPath);
console.log('NEXT: npm run dev');
