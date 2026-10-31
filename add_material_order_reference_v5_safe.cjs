const fs=require('fs'),path=require('path'),childProcess=require('child_process');
const root=process.cwd(),p=path.join(root,'src','App.jsx'),b=p+'.before-material-order-reference-v5';
const mark='M-CROSS_MATERIAL_ORDER_REFERENCE_V5_SAFE';
function fail(m){console.error('ERROR: '+m);process.exit(1)}
if(!fs.existsSync(p))fail('src/App.jsx が見つかりません。');
let s=fs.readFileSync(p,'utf8');
if(s.includes(mark)){console.log('SKIP: 材料発注参考V5は適用済みです。');process.exit(0)}
if(s.includes('M-CROSS_SEPARATE_SERVICE_MATERIAL_V3_SAFE'))fail('V3の変更痕跡があります。App.jsxの状態を確認してください。');
if(!s.includes('M-CROSS_EXCEL_STYLE_ORDER_PRICEBOOK_V1_SAFE'))fail('Excel風発注書V1が見つかりません。');

// Keep the current JSX structure. Only add reference helpers and controls around known anchors.
const totalLine='              const totalAmount = estimateRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) + additionalWorkTotal';
const tp=s.indexOf(totalLine); if(tp<0)fail('見積画面のtotalAmountを特定できません。');
const workspace='<div className="orderExcelWorkspace">';
const wp=s.indexOf(workspace,tp); if(wp<0)fail('Excel風発注ワークスペースを特定できません。');

fs.copyFileSync(p,b);
try{
  // A. Helpers: cross product-code aggregation only. CF remains unaggregated.
  const helpers=`\n              /* ${mark} */\n              const crossProductReferences=(()=>{\n                const grouped=new Map()\n                estimateRows.filter(row=>row.category==='cross').forEach(row=>{\n                  const parts=Array.isArray(row.parts)?row.parts:[]\n                  const possible=[parts[0],parts[1],parts[2],parts[3],row.memo].map(v=>String(v||'').trim()).filter(Boolean)\n                  const code=possible.find(v=>/^[A-Za-z]{1,4}[-－]?[A-Za-z0-9]{2,}$/.test(v))||''\n                  const key=code||'__NO_CODE__:'+String(row.label||parts.join(' '))\n                  if(!grouped.has(key))grouped.set(key,{code,label:row.label||parts.filter(Boolean).join(' '),quantity:0,rows:[]})\n                  const item=grouped.get(key);item.quantity+=Number(row.quantity||0);item.rows.push(row)\n                })\n                return [...grouped.values()]\n              })()\n              const cfCutReferences=(cfRecords||[]).flatMap(record=>{\n                const length=Number(record.length||0),count=Math.max(0,Math.trunc(Number(record.count)||0))\n                return Array.from({length:count},(_,index)=>({id:String(record.id||'cf')+'-'+index,room:record.room||'',length,memo:record.memo||''}))\n              })\n              const softReferenceQuantity=(softRecords||[]).reduce((sum,row)=>sum+Number(getSoftBaseboardQuantity(row)||0),0)\n`;
  s=s.slice(0,tp+totalLine.length)+helpers+s.slice(tp+totalLine.length);

  // B. Reference panel directly before existing workspace, no re-parenting.
  const wp2=s.indexOf(workspace,s.indexOf(totalLine));
  const refs=`{/* ${mark} */}\n                      <section className="materialOrderReferenceBoard">\n                        <details open><summary>クロス品番・参考数量</summary>\n                          <div className="materialReferenceList">{crossProductReferences.map((item,index)=><div key={(item.code||'none')+'-'+index}><strong>{item.code||'品番未入力'}</strong><span>{formatQuantity(item.quantity)}m</span><small>{item.label}</small></div>)}</div>\n                        </details>\n                        <details><summary>CF裁断データ（合算しない）</summary>\n                          <div className="materialReferenceList">{cfCutReferences.map(item=><div key={item.id}><strong>{item.room||'部屋未設定'}</strong><span>{formatQuantity(item.length)}m</span><small>{item.memo||'裁断1本'}</small></div>)}</div>\n                        </details>\n                        <details><summary>巾木 必要枚数</summary><div className="materialReferenceList"><div><strong>必要枚数</strong><span>{formatQuantity(softReferenceQuantity)}枚</span><small>ケース・バラの組み合わせは発注書で自由入力</small></div></div></details>\n                      </section>\n                      `;
  s=s.slice(0,wp2)+refs+s.slice(wp2);

  const cssAnchor='.orderExcelWorkspace{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(340px,.9fr);gap:14px;align-items:start}';
  if(!s.includes(cssAnchor))throw new Error('Excel風発注CSSを特定できません。');
  const css=`.materialOrderReferenceBoard{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 12px}.materialOrderReferenceBoard details{border:1px solid #86919a;background:#fff;color:#20252a}.materialOrderReferenceBoard summary{padding:9px 10px;background:#eef1f3;font-weight:900;cursor:pointer}.materialReferenceList{display:grid;max-height:260px;overflow:auto}.materialReferenceList>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px;padding:8px 10px;border-top:1px solid #c4c8cb}.materialReferenceList small{grid-column:1/-1;color:#666}@media(max-width:850px){.materialOrderReferenceBoard{grid-template-columns:1fr}}`;
  s=s.replace(cssAnchor,cssAnchor+css);

  fs.writeFileSync(p,s,'utf8');
  console.log('材料発注用の参考情報を追加しました。クロスは同品番を集計、CFは裁断1本ごとに保持、巾木は必要枚数のみ表示します。');
  childProcess.execSync('npm run build',{cwd:root,stdio:'inherit',shell:true});
  console.log('OK: 材料発注参考V5を適用しました。');
  console.log('BACKUP: '+b);
}catch(e){console.error('適用またはビルド失敗のため自動復旧します。');console.error(e.message||String(e));if(fs.existsSync(b))fs.copyFileSync(b,p);process.exit(1)}
