const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-order-quick-select-v2';
const mark='M-CROSS_ORDER_QUICK_SELECT_V2_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 発注クイック選択V2は適用済みです。');process.exit(0)}
if(!s.includes('M-CROSS_ORDER_SELECTION_STEP1_V4_STRUCTURAL_SAFE'))fail('発注選択STEP1 V4が見つかりません。');

const panel=s.indexOf('<section className="orderSelectionPanel" aria-label="発注項目の選択">');
if(panel<0)fail('発注選択パネルが見つかりません。');
const quickStart=s.indexOf('<div className="orderSelectionQuickButtons">',panel);
const quickEnd=s.indexOf('</div>',quickStart)+6;
if(quickStart<0||quickEnd<6)fail('クイック選択ボタン範囲を特定できません。');

const helperAnchor='              const additionalOrderKeys = orderCandidateRows.map((row,index) => ({row,key:orderKeyForRow(row,index)})).filter(({row}) => row.category === \'additionalWork\').map(({key}) => key)';
const hp=s.indexOf(helperAnchor);
if(hp<0)fail('発注候補ロジック位置を特定できません。');

fs.copyFileSync(p,b);
try{
 const helper=`\n              /* ${mark} */\n              const finishContractorKeywords=['壁下地処理','壁下地','床下地処理','床下地']\n              const finishContractorKeys=orderCandidateRows.map((row,index)=>({row,key:orderKeyForRow(row,index)})).filter(({row})=>{\n                if(['cross','cf','soft','floorTrim','crossPackage','cfPackage'].includes(row.category))return true\n                if(row.category!=='additionalWork')return false\n                const text=[row.label,...(Array.isArray(row.parts)?row.parts:[]),row.memo].filter(Boolean).join(' ')\n                return finishContractorKeywords.some(keyword=>text.includes(keyword))\n              }).map(({key})=>key)\n`;
 s=s.slice(0,hp+helperAnchor.length)+helper+s.slice(hp+helperAnchor.length);

 // Re-find after insertion.
 const p2=s.indexOf('<section className="orderSelectionPanel" aria-label="発注項目の選択">');
 const q1=s.indexOf('<div className="orderSelectionQuickButtons">',p2),q2=s.indexOf('</div>',q1)+6;
 const buttons=`<div className="orderSelectionQuickButtons">\n                      <button type="button" className="orderQuickPrimary" onClick={() => setSelectedOrderKeys(finishContractorKeys)}>内装一括</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys(allOrderKeys)}>全選択</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys(additionalOrderKeys)}>その他のみ</button>\n                      <button type="button" onClick={() => setSelectedOrderKeys([])}>クリア</button>\n                    </div>`;
 s=s.slice(0,q1)+buttons+s.slice(q2);

 const css='.orderSelectionQuickButtons button{min-height:44px;border:1px solid rgba(110,145,232,.5);border-radius:11px;background:#fff;color:#5b6270;font:inherit;font-weight:800}';
 if(!s.includes(css))throw new Error('クイック選択CSSを特定できません。');
 s=s.replace(css,css+'.orderSelectionQuickButtons .orderQuickPrimary{background:#6e91e8;color:#fff;border-color:#6e91e8}');

 fs.writeFileSync(p,s,'utf8');
 console.log('発注クイック選択を「内装一括」に整理しました。');
 console.log('対象: クロス / CF / 巾木 / 見切り / 壁下地処理 / 床下地処理');
 childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
 console.log('OK: 発注クイック選択V2を適用しました。');
 console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
