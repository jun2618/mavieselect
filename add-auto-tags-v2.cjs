const fs = require('fs');
const path = require('path');
const appPath = path.join(process.cwd(), 'src', 'App.jsx');
const backupPath = path.join(process.cwd(), 'src', 'App.jsx.before-auto-tags-v2');
const MARKER = '/* M-CROSS_AUTO_TAGS_V2 */';
if (!fs.existsSync(appPath)) { console.error('ERROR: src/App.jsx が見つかりません。'); process.exit(1); }
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes(MARKER)) { console.log('SKIP: 自動タグV2は適用済みです。'); process.exit(0); }
const anchor='function emptyPropertyMaster() {';
if(!s.includes(anchor)){console.error('ERROR: helper挿入位置が見つかりません。');process.exit(1)}
const helper=`${MARKER}
function buildAutoTags(entry) {
  const tags=new Set(); const cross=entry.records||[]; const cf=entry.cfRecords||[]; const soft=entry.softRecords||[]; const trim=entry.floorTrimRecords||[]; const works=entry.additionalWorks||[];
  if(cross.length)tags.add('クロスあり'); if(cf.length)tags.add('CFあり'); if(soft.length)tags.add('ソフト巾木あり'); if(trim.length)tags.add('床見切りあり'); if(works.length)tags.add('追加作業あり');
  const text=[entry.siteMemo||'',...cross.flatMap(r=>[r.room||'',r.type||'',r.memo||'']),...cf.flatMap(r=>[r.room||'',r.memo||'']),...soft.flatMap(r=>[r.room||'',r.memo||'']),...works.flatMap(r=>[r.room||'',r.work||'',r.memo||''])].join(' ').toLocaleLowerCase('ja');
  [['換気扇','換気扇'],['畳','畳'],['トイレ','トイレ'],['エアコン','エアコン'],['網戸','網戸'],['照明','照明'],['電球','電球'],['水漏れ','水漏れ'],['窓台','窓台'],['カーテン','カーテン'],['コーキング','コーキング']].forEach(([w,t])=>{if(text.includes(w))tags.add(t)});
  return [...tags]
}

`;
s=s.replace(anchor,helper+anchor);
if(s.includes('M-CROSS_SMART_SAVED_SEARCH_V4')){
 const needle="add('メモ',entry.draftMemo); add('現場メモ',entry.siteMemo);";
 if(!s.includes(needle)){console.error('ERROR: かしこい検索V4のタグ追加位置が見つかりません。');process.exit(1)}
 s=s.replace(needle,needle+" buildAutoTags(entry).forEach(tag=>add('タグ',tag));");
}
const cardAnchor='                      <div className="savedPrimaryActions">';
const n=s.split(cardAnchor).length-1;if(n!==1){console.error(`ERROR: 保存カード表示位置が ${n} 件でした。`);process.exit(1)}
const ui=`                      {buildAutoTags(entry).length > 0 && (\n                        <div className="autoTagList" aria-label="自動タグ">\n                          {buildAutoTags(entry).map(tag => <span className="autoTag" key={tag}>#{tag}</span>)}\n                        </div>\n                      )}\n`;
s=s.replace(cardAnchor,ui+cardAnchor);
const styleAnchor=s.includes('<style>{appStyles}</style>')?'<style>{appStyles}</style>':(s.includes('<style>{styles}</style>')?'<style>{styles}</style>':null);if(!styleAnchor){console.error('ERROR: style要素を特定できません。');process.exit(1)}
const css=`\n.autoTagList{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 4px}.autoTag{display:inline-flex;align-items:center;min-height:26px;padding:3px 9px;border:1px solid rgba(110,145,232,.4);border-radius:999px;background:rgba(110,145,232,.1);color:inherit;font-size:11px;font-weight:800}.theme-cyber .autoTag{border-color:#00eaff;color:#8cffff;background:rgba(0,234,255,.08);text-shadow:0 0 5px rgba(0,234,255,.7)}.theme-luxury .autoTag{border-color:#d8b76a;color:#f1d88d}.theme-sakura .autoTag{border-color:#efbfd0;color:#b64670}.theme-ice .autoTag{border-color:#76d8ff;color:#176b9a}.theme-forest .autoTag{border-color:#72c98a;color:#285c3a}.theme-retro .autoTag{border-color:#00eaff;color:#fff11c;border-radius:0;background:#061020}.theme-galaxy .autoTag{border-color:#bda4ff;color:#e4d9ff}\n`;
s=s.replace(styleAnchor,styleAnchor+'\n      <style>{`'+css+'`}</style>');
fs.copyFileSync(appPath,backupPath);fs.writeFileSync(appPath,s,'utf8');
console.log('OK: 自動タグV2を追加しました。');console.log('かしこい検索V4がある場合、タグも検索対象です。');console.log('BACKUP:',backupPath);console.log('NEXT: npm run dev');
