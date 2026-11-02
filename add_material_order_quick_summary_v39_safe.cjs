const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_MATERIAL_ORDER_QUICK_SUMMARY_V39_SAFE';
const backup=file+'.material-quick-summary-v39-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('材料発注クイック確認V39はすでに適用されています。');
if(!original.includes('M-CROSS_MATERIAL_PRICEBOOK_TO_ORDER_AND_BLANK_V38_SAFE'))fail('V38が見つかりません。先にV38を適用してください。');
let next=original;

// 1) materialOrderItems の近くに追加通知stateを追加。
const stateAnchor='const [materialOrderItems, setMaterialOrderItems] = useState([])';
const stateCount=next.split(stateAnchor).length-1;
if(stateCount!==1)fail('materialOrderItems state の検出数が '+stateCount+' 件です。');
next=next.replace(stateAnchor,stateAnchor+`\n  /* ${marker} */\n  const [materialAddNotice,setMaterialAddNotice]=useState('')`);

// 2) V38の「発注書へ追加」処理に通知を追加。
const statusOld="                                                  setSaveStatus('単価表から発注書へ追加しました')";
const statusCount=next.split(statusOld).length-1;
if(statusCount!==1)fail('V38の追加完了処理を一意に特定できません。');
next=next.replace(statusOld,`                                                  setSaveStatus('単価表から発注書へ追加しました')\n                                                  setMaterialAddNotice(String(row.name||'')+' を追加しました')\n                                                  window.setTimeout(()=>setMaterialAddNotice(''),1800)`);

// 3) 発注先/単価表エリアの後ろ、材料明細より前にクイック確認を追加。
const materialHeading='<div className="materialOrderMobileHeading">';
let insertPos=next.indexOf(materialHeading);
if(insertPos<0){
  const fallback='材料明細';
  const p=next.indexOf(fallback);
  if(p<0)fail('材料明細の表示位置が見つかりません。');
  insertPos=next.lastIndexOf('<',p);
}
const quick=`{/* ${marker} */}\n                        <aside className="materialOrderQuickSummary">\n                          <div className="materialOrderQuickSummaryTop">\n                            <div><strong>今回の発注明細</strong><small>{materialOrderItems.length}件</small></div>\n                            <strong>{formatYen((materialOrderItems||[]).reduce((sum,item)=>sum+((item.unitPrice===''||item.unitPrice==null)?0:(Number(item.quantity)||0)*(Number(item.unitPrice)||0)),0))}</strong>\n                          </div>\n                          {materialAddNotice&&<div className="materialOrderAddNotice">✓ {materialAddNotice}</div>}\n                          {materialOrderItems.length>0&&<div className="materialOrderQuickRows">{materialOrderItems.slice(-3).reverse().map((item,index)=><div key={(item.id||'quick')+'-'+index}><span>{item.productCode||'商品名未入力'}</span><b>{formatQuantity(Number(item.quantity)||0)}{item.unit||''}</b><strong>{item.unitPrice===''||item.unitPrice==null?'単価未設定':formatYen((Number(item.quantity)||0)*(Number(item.unitPrice)||0))}</strong></div>)}</div>}\n                          <button type="button" onClick={()=>document.querySelector('.materialOrderMobileHeading')?.scrollIntoView({behavior:'smooth',block:'start'})}>発注明細を確認・編集</button>\n                        </aside>\n                        `;
next=next.slice(0,insertPos)+quick+next.slice(insertPos);

// 4) 「空の発注書を作成」は単価表横ではなく、「選択した項目から発注書を作成」の並びに移動する。
// V38で入れた既存ボタンを削除。
const blankText='＋ 空の発注書を作成';
const blankPos=next.indexOf(blankText);
if(blankPos<0)fail('V38の空発注書ボタンが見つかりません。');
const blankStart=next.lastIndexOf('<button',blankPos);
const blankEnd=next.indexOf('</button>',blankPos);
if(blankStart<0||blankEnd<0)fail('空発注書ボタン範囲を特定できません。');
const blankBlock=next.slice(blankStart,blankEnd+9);
next=next.slice(0,blankStart)+next.slice(blankEnd+9);

const createText='選択した項目から発注書を作成';
const createPos=next.indexOf(createText);
if(createPos<0)fail('「選択した項目から発注書を作成」が見つかりません。');
const createStart=next.lastIndexOf('<button',createPos);
const createEnd=next.indexOf('</button>',createPos);
if(createStart<0||createEnd<0)fail('発注書作成ボタン範囲を特定できません。');
const newBlank=blankBlock.replace('materialBlankOrderButton','materialBlankOrderButton materialBlankOrderPrimary');
next=next.slice(0,createEnd+9)+`\n                    ${newBlank}`+next.slice(createEnd+9);

// 5) PCは右側に追従、スマホは下部固定バーに変形。
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */\n  .materialOrderQuickSummary{position:sticky;top:12px;z-index:7;width:min(100%,340px);margin:10px 0 14px auto;padding:11px;border:1px solid rgba(47,125,87,.38);border-radius:12px;background:#f5fff9;box-shadow:0 8px 22px rgba(0,0,0,.08);display:grid;gap:8px}.materialOrderQuickSummaryTop{display:flex;align-items:center;justify-content:space-between;gap:10px}.materialOrderQuickSummaryTop>div{display:grid}.materialOrderQuickSummaryTop small{color:#756a78}.materialOrderQuickRows{display:grid;gap:5px}.materialOrderQuickRows>div{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:7px;align-items:center;font-size:12px}.materialOrderQuickRows span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.materialOrderQuickRows strong{color:#d84d83;text-align:right}.materialOrderQuickSummary>button{min-height:38px;border:1px solid #2f7d57;border-radius:8px;background:#2f7d57;color:#fff;font:inherit;font-weight:900}.materialOrderAddNotice{padding:6px 8px;border-radius:8px;background:#dff7e9;color:#226443;font-size:12px;font-weight:900}.materialBlankOrderPrimary{margin-top:8px!important;width:100%!important;background:#fff7e8!important;color:#8b5614!important;border-color:#c78731!important}\n  @media(max-width:620px){.materialOrderQuickSummary{position:fixed!important;left:0!important;right:0!important;bottom:max(0px,env(safe-area-inset-bottom))!important;top:auto!important;z-index:2300!important;width:100%!important;max-width:none!important;margin:0!important;padding:8px 10px calc(8px + env(safe-area-inset-bottom))!important;border-radius:12px 12px 0 0!important;box-shadow:0 -6px 22px rgba(0,0,0,.21)!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important}.materialOrderQuickSummaryTop{min-width:0!important}.materialOrderQuickRows{display:none!important}.materialOrderAddNotice{grid-column:1/-1!important}.materialOrderQuickSummary>button{min-height:42px!important;white-space:nowrap!important}.materialMobilePanel{padding-bottom:110px!important}}\n`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('V39の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
  cp.execSync('npm run build',{stdio:'inherit',shell:true});
  console.log('');
  console.log('OK: 材料発注クイック確認V39を適用しました。');
  console.log('・追加直後に「追加しました」を表示');
  console.log('・PCは今回の発注明細/件数/合計を追従表示');
  console.log('・スマホは画面下固定バーで件数/合計/確認を表示');
  console.log('・空の発注書ボタンを「選択した項目から発注書を作成」の直下へ移動');
  console.log('・単価表から連続追加しても画面下へ自動スクロールしません');
  console.log('BACKUP: '+backup);
}catch(e){
  fs.copyFileSync(backup,file);
  console.error('ERROR: build失敗。App.jsxを自動復旧しました。');
  process.exit(1);
}
