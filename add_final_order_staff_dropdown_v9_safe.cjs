const fs=require('fs');
const cp=require('child_process');

const file='./src/App.jsx';
const marker='M-CROSS_FINAL_ORDER_STAFF_DROPDOWN_V9_SAFE';
const backup=file+'.staff-dropdown-v9-backup-'+Date.now();
function fail(m){console.error('ERROR: '+m);console.error('App.jsx は変更していません。');process.exit(1)}
if(!fs.existsSync(file))fail('src/App.jsx が見つかりません。');
const original=fs.readFileSync(file,'utf8');
if(original.includes(marker))fail('担当者選択V9はすでに適用されています。');
if(!original.includes('M-CROSS_FINAL_ORDER_XLSX_POPULATE_V6_SAFE'))fail('xlsx-populate V6が見つかりません。');
let next=original;

// 本発注書用の担当者選択 state。初期値は空欄。
const stateAnchor="  const [purchaseOrders,setPurchaseOrders]";
const statePos=next.indexOf(stateAnchor);
if(statePos<0)fail('purchaseOrders state が見つかりません。');
const lineEnd=next.indexOf('\n',statePos);
const staffState=`\n  /* ${marker} */\n  const [finalOrderStaff,setFinalOrderStaff]=useState('')\n  const finalOrderStaffMaster={\n    '町田':{name:'町田',phone:'090-9432-4445'},\n    '佐々木':{name:'佐々木',phone:'090-6995-5636'},\n    '坂下':{name:'坂下',phone:''}\n  }`;
next=next.slice(0,lineEnd)+staffState+next.slice(lineEnd);

// 本発注書プレビュー操作部へドロップダウンを追加。
const deleteButton='<button className="danger" type="button" onClick={()=>deletePurchaseOrder(selected.id)}>削除</button>';
if((next.split(deleteButton).length-1)!==1)fail('発注書削除ボタンを一意に特定できません。');
const selectUi=`{selected.status==='本発注'&&<label className="finalOrderStaffPicker"><span>担当</span><select value={finalOrderStaff} onChange={event=>setFinalOrderStaff(event.target.value)}><option value="">選択なし</option><option value="町田">町田</option><option value="佐々木">佐々木</option><option value="坂下">坂下</option></select></label>}${deleteButton}`;
next=next.replace(deleteButton,selectUi);

// Excel出力時、テンプレートの固定「担当 町田」を選択内容で上書き。未選択なら空欄。
const excelAnchor="      ws.cell('B13').value(order.address||'')";
if((next.split(excelAnchor).length-1)!==1)fail('発注書Excelの物件情報転記位置が見つかりません。');
const excelStaff=`${excelAnchor}\n      const staff=finalOrderStaffMaster[finalOrderStaff]||null\n      ws.cell('G12').value(staff?('担当 '+staff.name):'')\n      ws.cell('G13').value(staff&&staff.phone?('TEL '+staff.phone):'')`;
next=next.replace(excelAnchor,excelStaff);

// CSS
const cssAnchor='  .crossFinishPanel{display:grid;';
const cssPos=next.indexOf(cssAnchor);
if(cssPos<0)fail('CSS挿入位置が見つかりません。');
const css=`  /* ${marker} */\n  .finalOrderStaffPicker{display:flex!important;align-items:center!important;gap:6px!important;margin:0!important}.finalOrderStaffPicker span{font-size:12px;font-weight:900}.finalOrderStaffPicker select{min-height:40px;padding:6px 28px 6px 9px;border:1px solid #86919a;border-radius:8px;background:#fff;color:#20252a;font:inherit}.theme-dark .finalOrderStaffPicker select,.theme-cyber .finalOrderStaffPicker select,.theme-luxury .finalOrderStaffPicker select,.theme-retro .finalOrderStaffPicker select,.theme-galaxy .finalOrderStaffPicker select{background:#071522;color:#fff}.finalOrderStaffPicker{min-width:160px}@media(max-width:620px){.finalOrderStaffPicker{width:100%;justify-content:space-between}.finalOrderStaffPicker select{flex:1}}\n`;
next=next.slice(0,cssPos)+css+next.slice(cssPos);

if(next===original||!next.includes(marker))fail('担当者選択V9の適用に失敗しました。');
fs.copyFileSync(file,backup);fs.writeFileSync(file,next,'utf8');
try{
 cp.execSync('npm run build',{stdio:'inherit',shell:true});
 console.log('');console.log('OK: 本発注書 担当者選択V9を適用しました。');
 console.log('・初期表示は選択なし');
 console.log('・町田 / 佐々木 / 坂下 を選択可能');
 console.log('・町田 090-9432-4445');
 console.log('・佐々木 090-6995-5636');
 console.log('・坂下は電話番号未設定のため氏名のみ');
 console.log('・Excelの担当欄へ選択担当者を反映');
 console.log('BACKUP: '+backup);
}catch(e){fs.copyFileSync(backup,file);console.error('ERROR: build失敗。App.jsxを自動復旧しました。');process.exit(1)}
