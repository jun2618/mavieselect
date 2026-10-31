const fs = require('fs');
const path = require('path');
const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-smart-saved-search-v4');
const MARKER = '/* M-CROSS_SMART_SAVED_SEARCH_V4 */';
if (!fs.existsSync(appPath)) { console.error('ERROR: src/App.jsx が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(MARKER)) { console.log('SKIP: かしこい検索V4は適用済みです。'); process.exit(0); }
const anchor = 'function emptyPropertyMaster() {';
if (!s.includes(anchor)) { console.error('ERROR: helper挿入位置が見つかりません。'); process.exit(1); }
const helpers = `/* M-CROSS_SMART_SAVED_SEARCH_V4 */
const smartSearchSynonyms = [['cf','クッションフロア'],['クロス','壁紙'],['ソフト巾木','巾木'],['床見切り','見切り']]
function normalizeSmartSearchText(value) { return String(value ?? '').toLocaleLowerCase('ja').replace(/[\\s　]+/g,'').replace(/[()（）［］\\[\\]・,，.。:：/\\\\_-]+/g,'') }
function expandSmartSearchToken(token) { const n=normalizeSmartSearchText(token); if(!n)return[]; const r=new Set([n]); smartSearchSynonyms.forEach(g=>{const v=g.map(normalizeSmartSearchText); if(v.includes(n))v.forEach(x=>r.add(x))}); return [...r] }
function getSavedEntrySearchParts(entry) { const p=[]; const add=(label,value)=>{const text=String(value??'').trim(); if(text)p.push({label,text})}; add('物件名',entry.propertyName); add('管理会社',entry.company); add('住所',entry.address); add('号室',entry.unit); add('メモ',entry.draftMemo); (entry.rooms||[]).forEach(v=>add('部屋',v)); (entry.records||[]).forEach(r=>{add('部屋',r.room);add('クロス',r.type);add('メモ',r.memo)}); (entry.cfRecords||[]).forEach(r=>{add('部屋',r.room);add('工事','CF クッションフロア');add('メモ',r.memo)}); (entry.softRecords||[]).forEach(r=>{add('部屋',r.room);add('工事','ソフト巾木 巾木');add('メモ',r.memo)}); (entry.floorTrimRecords||[]).forEach(r=>{add('部屋',r.roomA);add('部屋',r.roomB);add('工事','床見切り 見切り');add('カラー',r.color)}); (entry.additionalWorks||[]).forEach(r=>{add('部屋',r.room);add('追加作業',r.work);add('メモ',r.memo)}); return p }
function smartSavedEntryMatch(entry, query) { const tokens=String(query||'').trim().split(/[\\s　]+/).filter(Boolean); if(!tokens.length)return true; const parts=getSavedEntrySearchParts(entry).map(x=>({...x,normalized:normalizeSmartSearchText(x.text)})); return tokens.every(token=>{const alternatives=expandSmartSearchToken(token); return parts.some(part=>alternatives.some(term=>part.normalized.includes(term)))}) }

`;
s = s.replace(anchor, helpers + anchor);
const blockRe = /  const visibleSavedEntries = useMemo\(\(\) => \{[\s\S]*?  \}, \[savedEntries, savedSearch, savedCompanyFilter, savedSortOrder, showArchived\]\)/;
const m = s.match(blockRe);
if (!m) { console.error('ERROR: visibleSavedEntries ブロックを特定できません。'); process.exit(1); }
const old=m[0];
const next=old
 .replace(/\s*const query = savedSearch\.trim\(\)\.toLocaleLowerCase\(\)\s*/, '\n')
 .replace(/\.filter\(entry =>\s*!query \|\| String\(entry\.propertyName \|\| ''\)\.toLocaleLowerCase\(\)\.includes\(query\)\s*\)/, ".filter(entry => smartSavedEntryMatch(entry, savedSearch))");
if (next===old || next.includes('!query || String(entry.propertyName')) { console.error('ERROR: 物件名検索部分だけを置換できません。'); process.exit(1); }
s=s.replace(old,next);
const label='<span>🔎 物件を検索</span>'; const ph='placeholder="物件名を入力"';
if(!s.includes(label)||!s.includes(ph)){console.error('ERROR: 検索欄を特定できません。');process.exit(1)}
s=s.replace(label,'<span>🔎 かしこい検索</span>').replace(ph,'placeholder="物件名・住所・号室・部屋・工事・メモを検索"');
fs.copyFileSync(appPath,backupPath); fs.writeFileSync(appPath,s,'utf8');
console.log('OK: かしこい検索V4を追加しました。');
console.log('BACKUP:',backupPath);
console.log('NEXT: npm run dev');
